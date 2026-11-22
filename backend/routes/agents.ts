import { Router, Response } from 'express';
import dns from 'dns';
import https from 'https';
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
  if (calls.size > 5000) {
    for (const [id, stamps] of calls) if (!stamps.some((t) => now - t < WINDOW_MS)) calls.delete(id);
  }
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

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** True for any address a webhook must never reach: loopback, private, link-local, multicast, unspecified. */
export function isPrivateAddress(raw: string): boolean {
  const ip = raw.toLowerCase().replace(/^\[|\]$/g, '');
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) {
    // IPv4-mapped addresses (::ffff:a.b.c.d or the hex form ::ffff:xxxx:xxxx) are judged by their IPv4 part.
    const dotted = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isPrivateIPv4(dotted[1]);
    const hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    return ip === '::' || ip === '::1' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || /^ff/.test(ip);
  }
  return true; // not a recognisable IP address: refuse
}

/** Checks the URL up front, before any network work. */
function parsePublicHttpsUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Enter a full webhook URL, starting with https://.');
  }
  if (url.protocol !== 'https:') throw new Error('Webhook URLs must use https://.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && isPrivateAddress(host)) throw new Error('Webhooks cannot target private or local network addresses.');
  return url;
}

/**
 * DNS lookup used for the actual connection. Checking here, at connect time, means a host that
 * resolves to a private address (or changes its answer between two lookups) is refused too.
 */
function publicOnlyLookup(hostname: string, options: any, callback: (err: Error | null, address?: any, family?: number) => void) {
  dns.lookup(hostname, { family: options?.family ?? 0 }, (err, address, family) => {
    if (err) return callback(err);
    if (isPrivateAddress(address)) return callback(new Error('Webhooks cannot target private or local network addresses.'));
    if (options?.all) return callback(null, [{ address, family }]);
    return callback(null, address, family);
  });
}

/** POSTs JSON over https. Redirects are not followed, so a public host cannot bounce the request inside the network. */
function postWebhook(url: URL, body: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        lookup: publicOnlyLookup as any,
        timeout: 8000,
      },
      (response) => {
        response.resume();
        resolve(response.statusCode ?? 0);
      },
    );
    req.on('timeout', () => req.destroy(new Error('The webhook did not answer in time.')));
    req.on('error', reject);
    req.end(body);
  });
}

router.post('/dispatch', async (req: AuthenticatedRequest, res: Response) => {
  if (rateLimited(req.user!.userId)) return res.status(429).json({ error: 'Too many runs. Wait a minute and try again.' });
  const { dispatchType, channel, webhookUrl, workflowName } = req.body || {};
  const payload = String(req.body?.payload ?? '').slice(0, 8000);
  if (!payload.trim()) return res.status(400).json({ error: 'The action node has nothing to send.' });

  if (dispatchType === 'webhook') {
    try {
      const url = parsePublicHttpsUrl(String(webhookUrl || ''));
      const status = await postWebhook(
        url,
        // `text` is read by Slack, `content` by Discord; generic receivers get both plus metadata.
        JSON.stringify({ text: payload, content: payload.slice(0, 2000), source: 'devpulse', workflow: workflowName || null }),
      );
      return res.json({ ok: status >= 200 && status < 300, status, detail: `Webhook answered HTTP ${status}.` });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'The webhook request failed.' });
    }
  }

  // Default: post into a DevPulse channel as the agent.
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
