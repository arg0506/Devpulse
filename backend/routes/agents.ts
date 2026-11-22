import { Router, Response } from 'express';
import dns from 'dns';
import net from 'net';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { generateText, groundedSearch, isGeminiReady, GEMINI_MODEL } from '../gemini';
import { getIO } from '../realtime';
import { AgentWorkflow, DevMessage } from '../../frontend/types';

const router = Router();
router.use(authMiddleware);

// ---------- Simple per-user rate limit for AI and dispatch calls ----------
const WINDOW_MS = 60_000;
const MAX_CALLS = 40;
const calls = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (calls.get(userId) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  calls.set(userId, recent);
  return recent.length > MAX_CALLS;
}

// ---------- Workflows ----------
router.get('/status', (_req, res) => {
  res.json({ gemini: isGeminiReady(), model: GEMINI_MODEL });
});

router.get('/workflows', (req: AuthenticatedRequest, res: Response) => {
  res.json(db.getWorkflows(req.user!.userId));
});

router.put('/workflows/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const body = req.body || {};
  const existing = db.getWorkflow(id);
  if (existing && existing.ownerId !== req.user!.userId) {
    return res.status(403).json({ error: 'You can only edit your own workflows.' });
  }
  if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    return res.status(400).json({ error: 'A workflow needs nodes and edges.' });
  }
  if (body.nodes.length > 50) return res.status(400).json({ error: 'Workflows are limited to 50 nodes.' });

  const workflow: AgentWorkflow = {
    id,
    name: String(body.name || 'Untitled workflow').slice(0, 60),
    description: String(body.description || '').slice(0, 200),
    ownerId: req.user!.userId,
    nodes: body.nodes,
    edges: body.edges,
    updatedAt: new Date().toISOString(),
  };
  res.json(db.saveWorkflow(workflow));
});

router.delete('/workflows/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = db.getWorkflow(req.params.id);
  if (!existing) return res.status(404).json({ error: 'That workflow no longer exists.' });
  if (existing.ownerId !== req.user!.userId) return res.status(403).json({ error: 'You can only delete your own workflows.' });
  db.deleteWorkflow(existing.id);
  res.json({ ok: true });
});

// ---------- Node executors ----------
router.post('/llm', async (req: AuthenticatedRequest, res: Response) => {
  if (rateLimited(req.user!.userId)) return res.status(429).json({ error: 'Too many runs. Wait a minute and try again.' });
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'The Gemini node has an empty prompt.' });
  try {
    const temperature = Number(req.body?.temperature);
    const text = await generateText(prompt.slice(0, 20000), {
      systemInstruction: req.body?.systemInstruction ? String(req.body.systemInstruction).slice(0, 4000) : undefined,
      temperature: Number.isFinite(temperature) ? Math.min(Math.max(temperature, 0), 2) : undefined,
    });
    res.json({ text, offline: !isGeminiReady() });
  } catch (err: any) {
    res.status(502).json({ error: `Gemini returned an error: ${err.message || err}` });
  }
});

router.post('/search', async (req: AuthenticatedRequest, res: Response) => {
  if (rateLimited(req.user!.userId)) return res.status(429).json({ error: 'Too many runs. Wait a minute and try again.' });
  const query = String(req.body?.query || '').trim();
  if (!query) return res.status(400).json({ error: 'The search node has an empty query.' });
  try {
    const result = await groundedSearch(query.slice(0, 500));
    res.json({ ...result, offline: !isGeminiReady() });
  } catch (err: any) {
    res.status(502).json({ error: `Search failed: ${err.message || err}` });
  }
});

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const lower = ip.toLowerCase();
  return (
    lower === '::1' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80') ||
    lower.startsWith('::ffff:127.') ||
    lower.startsWith('::ffff:10.') ||
    lower.startsWith('::ffff:192.168.')
  );
}

async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Enter a full webhook URL, starting with https://.');
  }
  if (url.protocol !== 'https:') throw new Error('Webhook URLs must use https://.');
  const { address } = await dns.promises.lookup(url.hostname);
  if (isPrivateAddress(address)) throw new Error('Webhooks cannot target private or local network addresses.');
  return url;
}

router.post('/dispatch', async (req: AuthenticatedRequest, res: Response) => {
  if (rateLimited(req.user!.userId)) return res.status(429).json({ error: 'Too many runs. Wait a minute and try again.' });
  const { dispatchType, channel, webhookUrl, workflowName } = req.body || {};
  const payload = String(req.body?.payload ?? '').slice(0, 8000);
  if (!payload.trim()) return res.status(400).json({ error: 'The action node has nothing to send.' });

  if (dispatchType === 'webhook') {
    try {
      const url = await assertPublicHttpsUrl(String(webhookUrl || ''));
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // `text` is read by Slack, `content` by Discord; generic receivers get both plus metadata.
        body: JSON.stringify({ text: payload, content: payload.slice(0, 2000), source: 'devpulse', workflow: workflowName || null }),
        signal: AbortSignal.timeout(8000),
      });
      return res.json({ ok: response.ok, status: response.status, detail: `Webhook answered HTTP ${response.status}.` });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'The webhook request failed.' });
    }
  }

  // Default: post into a Lemo channel as the agent.
  const channelId = String(channel || 'general').replace(/^#/, '');
  const target = db.getChannel(channelId);
  if (!target || target.category === 'Direct Messages') {
    return res.status(404).json({ error: `There is no #${channelId} channel to post in.` });
  }
  const owner = db.getUser(req.user!.userId);
  const message: DevMessage = {
    id: `agent-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    channelId,
    userId: 'system-bot',
    username: workflowName ? `agent · ${String(workflowName).slice(0, 40)}` : 'agent',
    role: `Run by @${owner?.username || req.user!.username}`,
    avatarEmoji: '⚡',
    isBot: true,
    text: payload,
    timestamp: new Date().toISOString(),
    repliesCount: 0,
    reactions: [],
  };
  db.addMessage(message);
  getIO()?.to(`channel:${channelId}`).emit('message:new', message);
  getIO()?.emit('channel:activity', { channelId, messageId: message.id });
  res.json({ ok: true, detail: `Posted to #${channelId}.` });
});

export default router;
