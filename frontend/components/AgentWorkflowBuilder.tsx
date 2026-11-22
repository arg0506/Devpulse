import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Plus,
  Trash2,
  Zap,
  Sparkles,
  Globe,
  Code2,
  Send,
  Save,
  FilePlus2,
  Loader2,
  CheckCircle2,
  XCircle,
  Circle,
  ChevronDown,
  ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';
import { runJavaScript } from '../lib/runCode';
import { useWorkspace } from '../lib/workspace';
import { AgentEdge, AgentNode, AgentNodeType, AgentWorkflow } from '../types';
import { Badge, Button, IconButton, ViewHeader, cx } from './ui';

const NODE_W = 216;
const NODE_H = 88;
const CANVAS_W = 2400;
const CANVAS_H = 1400;

type RunStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped';
interface NodeRun {
  status: RunStatus;
  output?: string;
  sources?: { title: string; url: string }[];
  ms?: number;
}

const NODE_META: Record<AgentNodeType, { label: string; icon: typeof Zap; hint: string }> = {
  trigger: { label: 'Trigger', icon: Zap, hint: 'Where a run starts, with a test input' },
  gemini: { label: 'Gemini', icon: Sparkles, hint: 'Generate or transform text with an LLM' },
  search: { label: 'Web search', icon: Globe, hint: 'Google Search, summarised with sources' },
  code: { label: 'JavaScript', icon: Code2, hint: 'Reshape data in an isolated worker' },
  action: { label: 'Action', icon: Send, hint: 'Post to a channel or a webhook' },
};

const nid = () => `n${Math.random().toString(36).slice(2, 6)}`;
const wid = () => `wf-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function defaultConfig(type: AgentNodeType): AgentNode['config'] {
  switch (type) {
    case 'trigger':
      return { triggerType: 'manual', samplePayload: 'Prisma throws "too many connections" in production' };
    case 'gemini':
      return { prompt: 'Summarise this in two sentences:\n{{prev}}', temperature: 0.4 };
    case 'search':
      return { searchQuery: '{{trigger.message}}' };
    case 'code':
      return { script: '// `input.prev` is the previous step, `input.results` holds every step by id.\nreturn input.prev.trim();' };
    case 'action':
      return { dispatchType: 'channel', channel: 'general', payloadTemplate: '{{prev}}' };
  }
}

function summary(node: AgentNode): string {
  const c = node.config;
  switch (node.type) {
    case 'trigger':
      return c.samplePayload ? `“${c.samplePayload}”` : 'Manual run';
    case 'gemini':
      return c.prompt || 'No prompt yet';
    case 'search':
      return c.searchQuery || 'No query yet';
    case 'code':
      return (c.script || '').split('\n').find((l) => l.trim() && !l.trim().startsWith('//')) || 'Empty script';
    case 'action':
      return c.dispatchType === 'webhook' ? c.webhookUrl || 'No webhook URL' : `Post to #${(c.channel || 'general').replace(/^#/, '')}`;
  }
}

// ---------- Presets ----------

function preset(
  name: string,
  description: string,
  build: () => { nodes: AgentNode[]; edges: [number, number][] },
): () => Omit<AgentWorkflow, 'ownerId' | 'updatedAt'> {
  return () => {
    const { nodes, edges } = build();
    return {
      id: wid(),
      name,
      description,
      nodes,
      edges: edges.map(([a, b]) => ({ id: `e-${nodes[a].id}-${nodes[b].id}`, fromId: nodes[a].id, toId: nodes[b].id })),
    };
  };
}

const PRESETS = [
  preset('Support responder', 'Searches the web for a bug report and posts a suggested fix to #bugs-and-fixes.', () => {
    const t = {
      id: nid(),
      type: 'trigger' as const,
      title: 'Bug report',
      x: 60,
      y: 160,
      config: { triggerType: 'chat_message' as const, samplePayload: 'Prisma throws "too many connections" on Vercel serverless' },
    };
    const s = { id: nid(), type: 'search' as const, title: 'Search for fixes', x: 330, y: 80, config: { searchQuery: '{{trigger.message}} fix' } };
    const g = {
      id: nid(),
      type: 'gemini' as const,
      title: 'Draft a reply',
      x: 600,
      y: 160,
      config: {
        prompt: `A developer reported: "{{trigger.message}}".\nUsing these findings:\n{{${s.id}.result}}\nWrite a short, practical fix with a code example.`,
        temperature: 0.3,
      },
    };
    const a = {
      id: nid(),
      type: 'action' as const,
      title: 'Post to #bugs-and-fixes',
      x: 870,
      y: 160,
      config: {
        dispatchType: 'channel' as const,
        channel: 'bugs-and-fixes',
        payloadTemplate: '**Suggested fix** for “{{trigger.message}}”\n\n{{prev}}',
      },
    };
    return {
      nodes: [t, s, g, a],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
      ],
    };
  }),
  preset('Weekly TypeScript digest', 'Finds this week’s TypeScript news, condenses it and posts a digest.', () => {
    const t = {
      id: nid(),
      type: 'trigger' as const,
      title: 'Start digest',
      x: 60,
      y: 160,
      config: { triggerType: 'manual' as const, samplePayload: 'TypeScript' },
    };
    const s = {
      id: nid(),
      type: 'search' as const,
      title: 'Latest news',
      x: 330,
      y: 160,
      config: { searchQuery: '{{trigger.message}} release news this week' },
    };
    const g = {
      id: nid(),
      type: 'gemini' as const,
      title: 'Three takeaways',
      x: 600,
      y: 80,
      config: { prompt: 'Condense into exactly three bullet points, one line each:\n{{prev}}', temperature: 0.5 },
    };
    const c = {
      id: nid(),
      type: 'code' as const,
      title: 'Format digest',
      x: 600,
      y: 250,
      config: {
        script: `const date = new Date().toLocaleDateString();\nreturn '**' + input.trigger + ' digest · ' + date + '**\\n' + input.results['${g.id}'];`,
      },
    };
    const a = {
      id: nid(),
      type: 'action' as const,
      title: 'Post to #showcase',
      x: 870,
      y: 250,
      config: { dispatchType: 'channel' as const, channel: 'showcase', payloadTemplate: '{{prev}}' },
    };
    return {
      nodes: [t, s, g, c, a],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
      ],
    };
  }),
  preset('Snippet reviewer', 'Reviews a code snippet and posts the review to #react-vite.', () => {
    const t = {
      id: nid(),
      type: 'trigger' as const,
      title: 'Snippet',
      x: 60,
      y: 160,
      config: { triggerType: 'manual' as const, samplePayload: 'useEffect(() => { fetch(url).then(r => r.json()).then(setData) }, [])' },
    };
    const g = {
      id: nid(),
      type: 'gemini' as const,
      title: 'Review',
      x: 330,
      y: 160,
      config: {
        prompt: 'Review this React code. List bugs and one improved version:\n```tsx\n{{trigger.message}}\n```',
        systemInstruction: 'You are a senior React reviewer. Be direct and brief.',
        temperature: 0.2,
      },
    };
    const a = {
      id: nid(),
      type: 'action' as const,
      title: 'Post review',
      x: 600,
      y: 160,
      config: { dispatchType: 'channel' as const, channel: 'react-vite', payloadTemplate: '{{prev}}' },
    };
    return {
      nodes: [t, g, a],
      edges: [
        [0, 1],
        [1, 2],
      ],
    };
  }),
];

// ---------- Templating ----------

function fillTemplate(tpl: string, ctx: { trigger: string; prev: string; results: Record<string, string> }): string {
  return (tpl || '').replace(/\{\{\s*([\w-]+)(?:\.(\w+))?\s*\}\}/g, (_m, a: string, b?: string) => {
    if (a === 'trigger') return ctx.trigger;
    if (a === 'prev' || a === 'input') return ctx.prev;
    if (ctx.results[a] !== undefined && (!b || b === 'result')) return ctx.results[a];
    return `{{${a}${b ? '.' + b : ''}}}`;
  });
}

function edgePath(from: AgentNode, to: AgentNode) {
  const x1 = from.x + NODE_W;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_H / 2;
  const dx = Math.max(40, Math.abs(x2 - x1) / 2);
  return `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

// ---------- Component ----------

export default function AgentWorkflowBuilder() {
  const { user, channels } = useWorkspace();
  const [workflow, setWorkflow] = useState<Omit<AgentWorkflow, 'ownerId' | 'updatedAt'>>(() => PRESETS[0]());
  const [saved, setSaved] = useState<AgentWorkflow[]>([]);
  const [dirty, setDirty] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, NodeRun>>({});
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<{ t: string; text: string; tone?: 'ok' | 'err' }[]>([]);
  const [gemini, setGemini] = useState<{ gemini: boolean; model: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [linking, setLinking] = useState<{ fromId: string; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const { nodes, edges } = workflow;
  const selected = nodes.find((n) => n.id === selectedId) || null;

  useEffect(() => {
    api<AgentWorkflow[]>('/api/agents/workflows')
      .then(setSaved)
      .catch(() => undefined);
    api<{ gemini: boolean; model: string }>('/api/agents/status')
      .then(setGemini)
      .catch(() => undefined);
  }, []);

  // Fit the whole workflow into view whenever a different workflow is opened.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !el.clientWidth || !workflow.nodes.length) return;
    const maxX = Math.max(...workflow.nodes.map((n) => n.x)) + NODE_W + 48;
    const maxY = Math.max(...workflow.nodes.map((n) => n.y)) + NODE_H + 48;
    setZoom(Math.max(0.5, Math.min(1, el.clientWidth / maxX, el.clientHeight / maxY)));
    el.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.id]);

  const update = useCallback((fn: (w: typeof workflow) => typeof workflow) => {
    setWorkflow(fn);
    setDirty(true);
  }, []);

  const updateNode = (id: string, patch: Partial<AgentNode> | ((n: AgentNode) => Partial<AgentNode>)) =>
    update((w) => ({ ...w, nodes: w.nodes.map((n) => (n.id === id ? { ...n, ...(typeof patch === 'function' ? patch(n) : patch) } : n)) }));

  const updateConfig = (id: string, patch: Partial<AgentNode['config']>) => updateNode(id, (n) => ({ config: { ...n.config, ...patch } }));

  const addNode = (type: AgentNodeType) => {
    const el = canvasRef.current;
    const x = ((el?.scrollLeft || 0) + 80 + Math.random() * 120) / zoom;
    const y = ((el?.scrollTop || 0) + 80 + Math.random() * 160) / zoom;
    const node: AgentNode = { id: nid(), type, title: NODE_META[type].label, x: Math.round(x), y: Math.round(y), config: defaultConfig(type) };
    update((w) => ({ ...w, nodes: [...w.nodes, node] }));
    setSelectedId(node.id);
  };

  const deleteNode = (id: string) => {
    update((w) => ({ ...w, nodes: w.nodes.filter((n) => n.id !== id), edges: w.edges.filter((e) => e.fromId !== id && e.toId !== id) }));
    setSelectedId(null);
  };

  const deleteEdge = (id: string) => {
    update((w) => ({ ...w, edges: w.edges.filter((e) => e.id !== id) }));
    setSelectedEdge(null);
  };

  const connect = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    if (edges.some((e) => e.fromId === fromId && e.toId === toId)) return;
    // Reject links that would create a loop.
    const reaches = (start: string, target: string): boolean => {
      const stack = [start];
      const seen = new Set<string>();
      while (stack.length) {
        const cur = stack.pop()!;
        if (cur === target) return true;
        if (seen.has(cur)) continue;
        seen.add(cur);
        edges.filter((e) => e.fromId === cur).forEach((e) => stack.push(e.toId));
      }
      return false;
    };
    if (reaches(toId, fromId)) return;
    const edge: AgentEdge = { id: `e-${fromId}-${toId}`, fromId, toId };
    update((w) => ({ ...w, edges: [...w.edges, edge] }));
  };

  // ---------- Drag & link ----------
  const pointerToCanvas = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left + canvasRef.current!.scrollLeft) / zoom, y: (e.clientY - rect.top + canvasRef.current!.scrollTop) / zoom };
  };

  const onNodePointerDown = (e: React.PointerEvent, node: AgentNode) => {
    if ((e.target as HTMLElement).closest('[data-port]')) return;
    e.stopPropagation();
    setSelectedId(node.id);
    setSelectedEdge(null);
    const p = pointerToCanvas(e);
    dragRef.current = { id: node.id, dx: p.x - node.x, dy: p.y - node.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointerToCanvas(e);
    if (dragRef.current) {
      const { id, dx, dy } = dragRef.current;
      const x = Math.max(0, Math.min(CANVAS_W - NODE_W, Math.round((p.x - dx) / 8) * 8));
      const y = Math.max(0, Math.min(CANVAS_H - NODE_H, Math.round((p.y - dy) / 8) * 8));
      setWorkflow((w) => ({ ...w, nodes: w.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) }));
      setDirty(true);
    } else if (linking) {
      setLinking({ ...linking, x: p.x, y: p.y });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    if (linking) {
      const p = pointerToCanvas(e);
      const target = nodes.find((n) => p.x >= n.x - 16 && p.x <= n.x + NODE_W && p.y >= n.y && p.y <= n.y + NODE_H);
      if (target) connect(linking.fromId, target.id);
      setLinking(null);
    }
  };

  // ---------- Save / load ----------
  const save = async () => {
    setSaving(true);
    try {
      const res = await api<AgentWorkflow>(`/api/agents/workflows/${workflow.id}`, { method: 'PUT', body: workflow });
      setSaved((prev) => [res, ...prev.filter((w) => w.id !== res.id)]);
      setDirty(false);
    } catch (err: any) {
      setLog((l) => [...l, { t: new Date().toLocaleTimeString(), text: `Save failed: ${err.message}`, tone: 'err' }]);
    } finally {
      setSaving(false);
    }
  };

  const load = (w: Omit<AgentWorkflow, 'ownerId' | 'updatedAt'>, isDirty: boolean) => {
    if (dirty && nodes.length && !confirm('Discard unsaved changes to this workflow?')) return;
    setWorkflow(JSON.parse(JSON.stringify(w)));
    setDirty(isDirty);
    setRuns({});
    setLog([]);
    setSelectedId(null);
    setMenuOpen(false);
  };

  const removeSaved = async (id: string) => {
    if (!confirm('Delete this saved workflow?')) return;
    await api(`/api/agents/workflows/${id}`, { method: 'DELETE' }).catch(() => undefined);
    setSaved((prev) => prev.filter((w) => w.id !== id));
    if (workflow.id === id) setDirty(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!canvasRef.current?.offsetParent) return; // view hidden
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      }
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select')) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedEdge) deleteEdge(selectedEdge);
        else if (selectedId) deleteNode(selectedId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---------- Run ----------
  const order = useMemo(() => {
    // Kahn's algorithm from every trigger.
    const indeg: Record<string, number> = {};
    nodes.forEach((n) => (indeg[n.id] = 0));
    edges.forEach((e) => indeg[e.toId] !== undefined && indeg[e.toId]++);
    const queue = nodes.filter((n) => n.type === 'trigger').map((n) => n.id);
    const out: string[] = [];
    const reachable = new Set(queue);
    while (queue.length) {
      const id = queue.shift()!;
      out.push(id);
      edges
        .filter((e) => e.fromId === id)
        .forEach((e) => {
          reachable.add(e.toId);
          indeg[e.toId]--;
          if (indeg[e.toId] <= 0) queue.push(e.toId);
        });
    }
    return out.filter((id) => reachable.has(id));
  }, [nodes, edges]);

  const run = async () => {
    const triggers = nodes.filter((n) => n.type === 'trigger');
    const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog([]);
    if (!triggers.length) {
      setLog([{ t: stamp(), text: 'Add a Trigger node: every run starts from one.', tone: 'err' }]);
      return;
    }
    setRunning(true);
    const initial: Record<string, NodeRun> = {};
    nodes.forEach((n) => (initial[n.id] = { status: order.includes(n.id) ? 'idle' : 'skipped' }));
    setRuns(initial);
    const push = (text: string, tone?: 'ok' | 'err') => setLog((l) => [...l, { t: stamp(), text, tone }]);
    push(`Running “${workflow.name}” · ${order.length} steps`);

    const results: Record<string, string> = {};
    const trigger = triggers[0].config.samplePayload || '';
    let failed = false;

    for (const id of order) {
      const node = nodes.find((n) => n.id === id)!;
      const parents = edges.filter((e) => e.toId === id).map((e) => e.fromId);
      const prev = parents
        .map((p) => results[p])
        .filter((v) => v !== undefined)
        .join('\n\n');
      const ctx = { trigger, prev, results };
      setRuns((r) => ({ ...r, [id]: { status: 'running' } }));
      const started = performance.now();
      try {
        let output = '';
        let sources: NodeRun['sources'];
        switch (node.type) {
          case 'trigger':
            output = node.config.samplePayload || '';
            break;
          case 'gemini': {
            const res = await api<{ text: string; offline: boolean }>('/api/agents/llm', {
              body: {
                prompt: fillTemplate(node.config.prompt || '', ctx),
                systemInstruction: node.config.systemInstruction,
                temperature: node.config.temperature,
              },
            });
            if (res.offline) push('Gemini is offline, so this step returned a notice instead of a real answer.', 'err');
            output = res.text;
            break;
          }
          case 'search': {
            const res = await api<{ text: string; sources: { title: string; url: string }[] }>('/api/agents/search', {
              body: { query: fillTemplate(node.config.searchQuery || '', ctx) },
            });
            output = res.text + (res.sources.length ? '\n\nSources:\n' + res.sources.map((s) => `- ${s.title}: ${s.url}`).join('\n') : '');
            sources = res.sources;
            break;
          }
          case 'code': {
            const res = await runJavaScript(node.config.script || '', { prev, results, trigger }, 4000);
            if (!res.ok) throw new Error(res.error);
            output = res.result ?? res.logs.join('\n');
            break;
          }
          case 'action': {
            const res = await api<{ detail: string }>('/api/agents/dispatch', {
              body: {
                dispatchType: node.config.dispatchType,
                channel: node.config.channel,
                webhookUrl: node.config.webhookUrl,
                payload: fillTemplate(node.config.payloadTemplate || '{{prev}}', ctx),
                workflowName: workflow.name,
              },
            });
            output = res.detail;
            break;
          }
        }
        results[id] = output;
        const ms = Math.round(performance.now() - started);
        setRuns((r) => ({ ...r, [id]: { status: 'success', output, sources, ms } }));
        push(`✓ ${node.title} · ${ms} ms`, 'ok');
      } catch (err: any) {
        const ms = Math.round(performance.now() - started);
        setRuns((r) => ({ ...r, [id]: { status: 'error', output: err.message, ms } }));
        push(`✗ ${node.title}: ${err.message}`, 'err');
        failed = true;
        break;
      }
    }
    if (failed) {
      setRuns((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.status === 'idle' ? { status: 'skipped' } : v])));
    } else {
      push('Run finished.', 'ok');
    }
    setRunning(false);
  };

  // ---------- Inspector helpers ----------
  const upstream = useMemo(() => {
    if (!selected) return [];
    const out: AgentNode[] = [];
    const stack = edges.filter((e) => e.toId === selected.id).map((e) => e.fromId);
    const seen = new Set<string>();
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const n = nodes.find((x) => x.id === id);
      if (n && n.type !== 'trigger') out.push(n);
      edges.filter((e) => e.toId === id).forEach((e) => stack.push(e.fromId));
    }
    return out;
  }, [selected, nodes, edges]);

  const VariableChips = ({ onInsert }: { onInsert: (v: string) => void }) => (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {['{{prev}}', '{{trigger.message}}', ...upstream.map((n) => `{{${n.id}.result}}`)].map((v) => {
        const node = upstream.find((n) => v.includes(n.id));
        return (
          <button
            key={v}
            type="button"
            onClick={() => onInsert(v)}
            title={node ? `Output of “${node.title}”` : undefined}
            className="rounded bg-subtle px-1.5 py-0.5 font-mono text-[10.5px] text-ink-2 hover:text-ink"
          >
            {node ? `${node.title} ↵` : v}
          </button>
        );
      })}
    </div>
  );

  const roomChannels = channels.filter((c) => c.category === 'Channels' || c.category === 'Guilds');

  const statusIcon = (s?: RunStatus) => {
    if (s === 'running') return <Loader2 size={13} className="animate-spin text-warn" />;
    if (s === 'success') return <CheckCircle2 size={13} className="text-ok" />;
    if (s === 'error') return <XCircle size={13} className="text-err" />;
    return <Circle size={11} className="text-line-strong" />;
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-surface">
      <ViewHeader
        title={
          <span className="flex items-center gap-2">
            <input
              value={workflow.name}
              onChange={(e) => update((w) => ({ ...w, name: e.target.value }))}
              size={Math.min(Math.max(workflow.name.length, 8), 36)}
              className="-ml-1 max-w-[40vw] rounded px-1 font-semibold hover:bg-subtle focus:bg-subtle focus:outline-none"
              aria-label="Workflow name"
            />
            {dirty ? <Badge tone="warn">Unsaved</Badge> : <Badge tone="ok">Saved</Badge>}
          </span>
        }
        subtitle={
          gemini
            ? gemini.gemini
              ? `Gemini connected · ${gemini.model}`
              : 'Gemini offline: set GEMINI_API_KEY on the server for live AI steps'
            : 'Agent studio'
        }
        actions={
          <>
            <div className="relative">
              <Button size="sm" variant="ghost" onClick={() => setMenuOpen((m) => !m)} aria-expanded={menuOpen}>
                Workflows <ChevronDown size={13} />
              </Button>
              {menuOpen && (
                <div className="absolute top-9 right-0 z-30 w-80 rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                  <button
                    type="button"
                    onClick={() =>
                      load(
                        {
                          id: wid(),
                          name: 'Untitled workflow',
                          description: '',
                          nodes: [{ id: nid(), type: 'trigger', title: 'Trigger', x: 80, y: 160, config: defaultConfig('trigger') }],
                          edges: [],
                        },
                        true,
                      )
                    }
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] hover:bg-subtle"
                  >
                    <FilePlus2 size={14} /> New blank workflow
                  </button>
                  <p className="eyebrow px-2.5 pt-2 pb-1">Templates</p>
                  {PRESETS.map((p, i) => {
                    const w = p();
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => load(p(), true)}
                        className="block w-full rounded-md px-2.5 py-2 text-left hover:bg-subtle"
                      >
                        <span className="block text-[13px] text-ink">{w.name}</span>
                        <span className="block text-[11.5px] text-ink-3">{w.description}</span>
                      </button>
                    );
                  })}
                  <p className="eyebrow px-2.5 pt-2 pb-1">Saved by you</p>
                  {saved.length === 0 && <p className="px-2.5 pb-2 text-[12px] text-ink-3">Nothing saved yet. Press Save or Ctrl S.</p>}
                  {saved.map((w) => (
                    <div key={w.id} className="group flex items-center rounded-md hover:bg-subtle">
                      <button type="button" onClick={() => load(w, false)} className="min-w-0 flex-1 px-2.5 py-2 text-left">
                        <span className="block truncate text-[13px] text-ink">{w.name}</span>
                        <span className="block text-[11.5px] text-ink-3">
                          {w.nodes.length} steps · {new Date(w.updatedAt).toLocaleDateString()}
                        </span>
                      </button>
                      <IconButton label="Delete saved workflow" className="mr-1 opacity-0 group-hover:opacity-100" onClick={() => removeSaved(w.id)}>
                        <Trash2 size={13} />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
              <Save size={13} /> Save
            </Button>
            <Button size="sm" variant="primary" onClick={run} loading={running}>
              {!running && <Play size={13} />} Run
            </Button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1" onClick={() => menuOpen && setMenuOpen(false)}>
        {/* Palette */}
        <aside className="hidden w-[220px] flex-shrink-0 flex-col gap-1 overflow-y-auto border-r border-line p-3 lg:flex">
          <p className="eyebrow mb-1 px-1">Add a step</p>
          {(Object.keys(NODE_META) as AgentNodeType[]).map((type) => {
            const { label, icon: Icon, hint } = NODE_META[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => addNode(type)}
                className="group flex items-start gap-2.5 rounded-lg border border-transparent p-2 text-left hover:border-line hover:bg-canvas"
              >
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-subtle text-ink-2 group-hover:text-ink">
                  <Icon size={14} />
                </span>
                <span>
                  <span className="block text-[13px] font-medium text-ink">{label}</span>
                  <span className="block text-[11.5px] leading-snug text-ink-3">{hint}</span>
                </span>
              </button>
            );
          })}
          <div className="mt-auto rounded-lg bg-canvas p-3 text-[11.5px] leading-relaxed text-ink-3">
            Drag a node to move it. Drag from the dot on its right edge onto another node to connect them. Select a node or link and press Delete to
            remove it.
          </div>
        </aside>

        {/* Canvas */}
        <div className="relative flex min-w-0 flex-1">
          <div
            ref={canvasRef}
            className="relative min-w-0 flex-1 overflow-auto bg-canvas"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerDown={() => {
              setSelectedId(null);
              setSelectedEdge(null);
            }}
          >
            <div style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom }}>
              <div
                className="relative origin-top-left"
                style={{
                  width: CANVAS_W,
                  height: CANVAS_H,
                  transform: `scale(${zoom})`,
                  backgroundImage: 'radial-gradient(var(--c-line-strong) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              >
                <svg className="absolute inset-0 overflow-visible" width={CANVAS_W} height={CANVAS_H}>
                  {edges.map((e) => {
                    const from = nodes.find((n) => n.id === e.fromId);
                    const to = nodes.find((n) => n.id === e.toId);
                    if (!from || !to) return null;
                    const d = edgePath(from, to);
                    const active = runs[from.id]?.status === 'success' && runs[to.id]?.status === 'running';
                    const done = runs[from.id]?.status === 'success' && ['success', 'error'].includes(runs[to.id]?.status || '');
                    return (
                      <g key={e.id}>
                        <path
                          d={d}
                          stroke="transparent"
                          strokeWidth="14"
                          fill="none"
                          className="cursor-pointer"
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            setSelectedEdge(e.id);
                            setSelectedId(null);
                          }}
                        />
                        <path
                          d={d}
                          fill="none"
                          strokeWidth={selectedEdge === e.id ? 2.5 : 1.6}
                          stroke={selectedEdge === e.id || active ? 'var(--c-accent)' : done ? 'var(--c-ok)' : 'var(--c-line-strong)'}
                          strokeDasharray={active ? '6 6' : undefined}
                          className="pointer-events-none"
                        >
                          {active && <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.6s" repeatCount="indefinite" />}
                        </path>
                      </g>
                    );
                  })}
                  {linking &&
                    (() => {
                      const from = nodes.find((n) => n.id === linking.fromId);
                      if (!from) return null;
                      const x1 = from.x + NODE_W;
                      const y1 = from.y + NODE_H / 2;
                      return (
                        <path
                          d={`M${x1} ${y1} C${x1 + 60} ${y1}, ${linking.x - 60} ${linking.y}, ${linking.x} ${linking.y}`}
                          fill="none"
                          stroke="var(--c-accent)"
                          strokeWidth="1.6"
                          strokeDasharray="4 4"
                        />
                      );
                    })()}
                </svg>

                {nodes.map((node) => {
                  const { icon: Icon, label } = NODE_META[node.type];
                  const r = runs[node.id];
                  return (
                    <div
                      key={node.id}
                      onPointerDown={(e) => onNodePointerDown(e, node)}
                      className={cx(
                        'absolute flex cursor-grab touch-none flex-col rounded-xl border bg-surface px-3 py-2.5 shadow-sm transition-[border-color,box-shadow] select-none active:cursor-grabbing',
                        selectedId === node.id
                          ? 'border-ink shadow-pop'
                          : r?.status === 'running'
                            ? 'border-warn'
                            : r?.status === 'error'
                              ? 'border-err'
                              : 'border-line hover:border-line-strong',
                        r?.status === 'skipped' && 'opacity-50',
                      )}
                      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon size={13} className={node.type === 'gemini' ? 'text-accent' : 'text-ink-2'} />
                        <span className="eyebrow">{label}</span>
                        <span className="ml-auto flex items-center gap-1">
                          {r?.ms !== undefined && <span className="font-mono text-[10px] text-ink-3">{r.ms}ms</span>}
                          {statusIcon(r?.status)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[13px] font-medium text-ink">{node.title}</p>
                      <p className="truncate font-mono text-[11px] text-ink-3">{summary(node)}</p>

                      {node.type !== 'trigger' && (
                        <span className="absolute top-1/2 -left-[5px] h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-surface bg-line-strong" />
                      )}
                      <span
                        data-port
                        role="button"
                        aria-label={`Connect from ${node.title}`}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          const p = pointerToCanvas(e);
                          setLinking({ fromId: node.id, x: p.x, y: p.y });
                        }}
                        className="absolute top-1/2 -right-[7px] flex h-3.5 w-3.5 -translate-y-1/2 cursor-crosshair items-center justify-center rounded-full border-2 border-surface bg-ink hover:scale-125"
                      />
                    </div>
                  );
                })}

                {nodes.length === 0 && (
                  <div className="absolute top-40 left-20 max-w-xs text-[13px] text-ink-3">
                    Add a Trigger from the left to start a workflow, or open a template from Workflows.
                  </div>
                )}
              </div>
            </div>

            {/* Small-screen palette */}
            <div className="fixed bottom-10 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-xl border border-line bg-surface p-1 shadow-pop lg:hidden">
              {(Object.keys(NODE_META) as AgentNodeType[]).map((type) => {
                const { label, icon: Icon } = NODE_META[type];
                return (
                  <IconButton key={type} label={`Add ${label}`} onClick={() => addNode(type)}>
                    <Icon size={15} />
                  </IconButton>
                );
              })}
            </div>
          </div>

          {/* Zoom */}
          <div
            className="absolute right-3 bottom-3 z-10 flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shadow-pop"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <IconButton label="Zoom out" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}>
              −
            </IconButton>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="h-7 min-w-12 rounded-md px-1 font-mono text-[11px] text-ink-2 hover:bg-subtle"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <IconButton label="Zoom in" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}>
              +
            </IconButton>
          </div>
        </div>

        {/* Inspector / run log */}
        <aside className="hidden w-[320px] flex-shrink-0 flex-col overflow-y-auto border-l border-line md:flex">
          {selected ? (
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{NODE_META[selected.type].label} step</span>
                <IconButton label="Delete step" className="hover:text-err" onClick={() => deleteNode(selected.id)}>
                  <Trash2 size={14} />
                </IconButton>
              </div>
              <div>
                <label className="label" htmlFor="nd-title">
                  Name
                </label>
                <input id="nd-title" className="field" value={selected.title} onChange={(e) => updateNode(selected.id, { title: e.target.value })} />
              </div>

              {selected.type === 'trigger' && (
                <>
                  <div>
                    <label className="label" htmlFor="nd-tt">
                      Starts
                    </label>
                    <select
                      id="nd-tt"
                      className="field"
                      value={selected.config.triggerType || 'manual'}
                      onChange={(e) => updateConfig(selected.id, { triggerType: e.target.value as any })}
                    >
                      <option value="manual">When you press Run</option>
                      <option value="chat_message">From a chat message (test with the input below)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="nd-sample">
                      Test input
                    </label>
                    <textarea
                      id="nd-sample"
                      rows={4}
                      className="field resize-y text-[13px]"
                      value={selected.config.samplePayload || ''}
                      onChange={(e) => updateConfig(selected.id, { samplePayload: e.target.value })}
                    />
                    <p className="mt-1 text-[11.5px] text-ink-3">
                      Available to later steps as <span className="font-mono">{'{{trigger.message}}'}</span>.
                    </p>
                  </div>
                </>
              )}

              {selected.type === 'gemini' && (
                <>
                  <div>
                    <label className="label" htmlFor="nd-prompt">
                      Prompt
                    </label>
                    <textarea
                      id="nd-prompt"
                      rows={7}
                      className="field resize-y font-mono text-[12px] leading-relaxed"
                      value={selected.config.prompt || ''}
                      onChange={(e) => updateConfig(selected.id, { prompt: e.target.value })}
                    />
                    <VariableChips onInsert={(v) => updateConfig(selected.id, { prompt: (selected.config.prompt || '') + v })} />
                  </div>
                  <div>
                    <label className="label" htmlFor="nd-sys">
                      System instruction <span className="font-normal text-ink-3">· optional</span>
                    </label>
                    <textarea
                      id="nd-sys"
                      rows={2}
                      className="field resize-y text-[13px]"
                      value={selected.config.systemInstruction || ''}
                      onChange={(e) => updateConfig(selected.id, { systemInstruction: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="nd-temp">
                      Temperature · {selected.config.temperature ?? 0.4}
                    </label>
                    <input
                      id="nd-temp"
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.1}
                      value={selected.config.temperature ?? 0.4}
                      onChange={(e) => updateConfig(selected.id, { temperature: Number(e.target.value) })}
                      className="w-full accent-[var(--c-ink)]"
                    />
                    <div className="flex justify-between text-[11px] text-ink-3">
                      <span>Precise</span>
                      <span>Creative</span>
                    </div>
                  </div>
                </>
              )}

              {selected.type === 'search' && (
                <div>
                  <label className="label" htmlFor="nd-q">
                    Search for
                  </label>
                  <input
                    id="nd-q"
                    className="field font-mono text-[12.5px]"
                    value={selected.config.searchQuery || ''}
                    onChange={(e) => updateConfig(selected.id, { searchQuery: e.target.value })}
                  />
                  <VariableChips onInsert={(v) => updateConfig(selected.id, { searchQuery: (selected.config.searchQuery || '') + v })} />
                </div>
              )}

              {selected.type === 'code' && (
                <div>
                  <label className="label" htmlFor="nd-code">
                    Script
                  </label>
                  <textarea
                    id="nd-code"
                    rows={10}
                    spellCheck={false}
                    className="field resize-y font-mono text-[12px] leading-relaxed"
                    value={selected.config.script || ''}
                    onChange={(e) => updateConfig(selected.id, { script: e.target.value })}
                  />
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
                    Runs in your browser in an isolated worker for up to 4 s. Read <span className="font-mono">input.prev</span>,{' '}
                    <span className="font-mono">input.trigger</span> and <span className="font-mono">input.results[id]</span>;{' '}
                    <span className="font-mono">return</span> the output.
                  </p>
                </div>
              )}

              {selected.type === 'action' && (
                <>
                  <div>
                    <label className="label" htmlFor="nd-dt">
                      Send to
                    </label>
                    <select
                      id="nd-dt"
                      className="field"
                      value={selected.config.dispatchType || 'channel'}
                      onChange={(e) => updateConfig(selected.id, { dispatchType: e.target.value as any })}
                    >
                      <option value="channel">A Lemo channel</option>
                      <option value="webhook">A webhook (Slack, Discord, any https URL)</option>
                    </select>
                  </div>
                  {selected.config.dispatchType === 'webhook' ? (
                    <div>
                      <label className="label" htmlFor="nd-url">
                        Webhook URL
                      </label>
                      <input
                        id="nd-url"
                        type="url"
                        className="field font-mono text-[12px]"
                        placeholder="https://hooks.slack.com/services/…"
                        value={selected.config.webhookUrl || ''}
                        onChange={(e) => updateConfig(selected.id, { webhookUrl: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="label" htmlFor="nd-ch">
                        Channel
                      </label>
                      <select
                        id="nd-ch"
                        className="field"
                        value={(selected.config.channel || 'general').replace(/^#/, '')}
                        onChange={(e) => updateConfig(selected.id, { channel: e.target.value })}
                      >
                        {roomChannels.map((c) => (
                          <option key={c.id} value={c.id}>
                            #{c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="label" htmlFor="nd-tpl">
                      Message
                    </label>
                    <textarea
                      id="nd-tpl"
                      rows={5}
                      className="field resize-y font-mono text-[12px]"
                      value={selected.config.payloadTemplate || ''}
                      onChange={(e) => updateConfig(selected.id, { payloadTemplate: e.target.value })}
                    />
                    <VariableChips onInsert={(v) => updateConfig(selected.id, { payloadTemplate: (selected.config.payloadTemplate || '') + v })} />
                  </div>
                </>
              )}

              {runs[selected.id]?.output !== undefined && (
                <div>
                  <span className="label">Last output</span>
                  <pre
                    className={cx(
                      'max-h-64 overflow-auto rounded-lg border bg-canvas p-2.5 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap',
                      runs[selected.id].status === 'error' ? 'border-err/40 text-err' : 'border-line text-ink-2',
                    )}
                  >
                    {runs[selected.id].output || '(empty)'}
                  </pre>
                  {runs[selected.id].sources?.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1 flex items-center gap-1 truncate text-[12px] text-ink-2 hover:text-ink"
                    >
                      <ExternalLink size={11} className="flex-shrink-0" /> <span className="truncate">{s.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col p-4">
              <label className="label" htmlFor="wf-desc">
                Description
              </label>
              <textarea
                id="wf-desc"
                rows={2}
                className="field resize-none text-[13px]"
                placeholder="What does this workflow do?"
                value={workflow.description || ''}
                onChange={(e) => update((w) => ({ ...w, description: e.target.value }))}
              />

              <p className="eyebrow mt-6 mb-2">Run log</p>
              {log.length === 0 ? (
                <p className="text-[12.5px] leading-relaxed text-ink-3">
                  Press Run to execute the steps in order. Select a step to edit it and see its output.
                </p>
              ) : (
                <ol className="space-y-1 font-mono text-[11.5px]">
                  {log.map((l, i) => (
                    <li key={i} className={cx('flex gap-2', l.tone === 'ok' ? 'text-ok' : l.tone === 'err' ? 'text-err' : 'text-ink-2')}>
                      <span className="flex-shrink-0 text-ink-3">{l.t}</span>
                      <span className="min-w-0 break-words">{l.text}</span>
                    </li>
                  ))}
                </ol>
              )}

              <p className="eyebrow mt-6 mb-2">Steps</p>
              <ol className="space-y-1">
                {order.map((id, i) => {
                  const n = nodes.find((x) => x.id === id)!;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(id)}
                        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[12.5px] hover:bg-subtle"
                      >
                        <span className="w-4 font-mono text-[11px] text-ink-3">{i + 1}</span>
                        {statusIcon(runs[id]?.status)}
                        <span className="truncate text-ink-2">{n.title}</span>
                      </button>
                    </li>
                  );
                })}
                {nodes.length > order.length && (
                  <li className="px-1.5 text-[11.5px] text-ink-3">
                    {nodes.length - order.length} step(s) are not connected to a trigger and will be skipped.
                  </li>
                )}
              </ol>
              <p className="mt-auto pt-6 text-[11.5px] text-ink-3">Signed in as @{user.username}. Saved workflows are private to you.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
