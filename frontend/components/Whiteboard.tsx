import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  MousePointer2,
  Pencil,
  Square,
  Circle,
  Minus,
  MoveUpRight,
  Type,
  Eraser,
  Undo2,
  Trash2,
  Download,
  Plus,
  Minus as ZoomOut,
  Scan,
} from 'lucide-react';
import { socket } from '../socket';
import { useWorkspace } from '../lib/workspace';
import { WhiteboardElement, WhiteboardTool } from '../types';
import { IconButton, ViewHeader, cx } from './ui';

// Colours are stored as theme tokens where possible so the board reads well in light and dark.
const COLORS: { id: string; label: string }[] = [
  { id: 'ink', label: 'Ink' },
  { id: 'accent', label: 'Coral' },
  { id: '#2f6fed', label: 'Blue' },
  { id: 'ok', label: 'Green' },
  { id: 'warn', label: 'Amber' },
  { id: '#8b5cf6', label: 'Violet' },
];
const WIDTHS = [2, 3, 5];

const TOOLS: { id: WhiteboardTool; label: string; key: string; icon: typeof Square }[] = [
  { id: 'select', label: 'Select and move', key: 'v', icon: MousePointer2 },
  { id: 'pen', label: 'Pen', key: 'p', icon: Pencil },
  { id: 'rectangle', label: 'Rectangle', key: 'r', icon: Square },
  { id: 'circle', label: 'Ellipse', key: 'o', icon: Circle },
  { id: 'line', label: 'Line', key: 'l', icon: Minus },
  { id: 'arrow', label: 'Arrow', key: 'a', icon: MoveUpRight },
  { id: 'text', label: 'Text', key: 't', icon: Type },
  { id: 'eraser', label: 'Eraser', key: 'e', icon: Eraser },
];

function resolveColor(c: string): string {
  if (c.startsWith('#')) return c;
  return getComputedStyle(document.documentElement).getPropertyValue(`--c-${c}`).trim() || '#111318';
}

const uid = () => `wb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function textWidth(el: WhiteboardElement) {
  return (el.text?.length || 1) * 16 * 0.58;
}

function hitTest(el: WhiteboardElement, x: number, y: number, tol: number): boolean {
  const sw = (el.strokeWidth || 2) / 2 + tol;
  switch (el.type) {
    case 'rectangle':
      return x >= el.x - sw && x <= el.x + el.width + sw && y >= el.y - sw && y <= el.y + el.height + sw;
    case 'circle': {
      const rx = el.width / 2 + sw;
      const ry = el.height / 2 + sw;
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      return (x - cx) ** 2 / (rx * rx) + (y - cy) ** 2 / (ry * ry) <= 1;
    }
    case 'line':
    case 'arrow':
      return distToSegment(x, y, el.x, el.y, el.x + el.width, el.y + el.height) <= sw;
    case 'pen': {
      const p = el.points || [];
      for (let i = 2; i < p.length; i += 2) {
        if (distToSegment(x, y, el.x + p[i - 2], el.y + p[i - 1], el.x + p[i], el.y + p[i + 1]) <= sw) return true;
      }
      return false;
    }
    case 'text':
      return x >= el.x - tol && x <= el.x + textWidth(el) + tol && y >= el.y - tol && y <= el.y + 22 + tol;
  }
}

function bounds(el: WhiteboardElement) {
  if (el.type === 'pen') {
    const p = el.points || [];
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (let i = 0; i < p.length; i += 2) {
      minX = Math.min(minX, p[i]);
      maxX = Math.max(maxX, p[i]);
      minY = Math.min(minY, p[i + 1]);
      maxY = Math.max(maxY, p[i + 1]);
    }
    return { x: el.x + minX, y: el.y + minY, w: maxX - minX, h: maxY - minY };
  }
  if (el.type === 'text') return { x: el.x, y: el.y, w: textWidth(el), h: 22 };
  return { x: Math.min(el.x, el.x + el.width), y: Math.min(el.y, el.y + el.height), w: Math.abs(el.width), h: Math.abs(el.height) };
}

function drawElement(ctx: CanvasRenderingContext2D, el: WhiteboardElement) {
  const color = resolveColor(el.color);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = el.strokeWidth || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  switch (el.type) {
    case 'rectangle': {
      const r = Math.min(8, Math.abs(el.width) / 4, Math.abs(el.height) / 4);
      ctx.roundRect(el.x, el.y, el.width, el.height, r);
      ctx.stroke();
      break;
    }
    case 'circle':
      ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, Math.abs(el.width / 2), Math.abs(el.height / 2), 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'line':
    case 'arrow': {
      const x2 = el.x + el.width;
      const y2 = el.y + el.height;
      ctx.moveTo(el.x, el.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (el.type === 'arrow') {
        const angle = Math.atan2(el.height, el.width);
        const head = 10 + (el.strokeWidth || 2) * 1.5;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - head * Math.cos(angle - Math.PI / 7), y2 - head * Math.sin(angle - Math.PI / 7));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - head * Math.cos(angle + Math.PI / 7), y2 - head * Math.sin(angle + Math.PI / 7));
        ctx.stroke();
      }
      break;
    }
    case 'pen': {
      const p = el.points || [];
      if (p.length < 2) break;
      ctx.moveTo(el.x + p[0], el.y + p[1]);
      for (let i = 2; i < p.length - 2; i += 2) {
        const mx = (p[i] + p[i + 2]) / 2;
        const my = (p[i + 1] + p[i + 3]) / 2;
        ctx.quadraticCurveTo(el.x + p[i], el.y + p[i + 1], el.x + mx, el.y + my);
      }
      ctx.lineTo(el.x + p[p.length - 2], el.y + p[p.length - 1]);
      ctx.stroke();
      break;
    }
    case 'text':
      ctx.font = '500 16px "IBM Plex Sans", system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(el.text || '', el.x, el.y + 2);
      break;
  }
}

interface RemoteCursor {
  userId: string;
  username: string;
  x: number;
  y: number;
  at: number;
}

export default function Whiteboard({ active }: { active: boolean }) {
  const { user, theme } = useWorkspace();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [tool, setTool] = useState<WhiteboardTool>('rectangle');
  const [color, setColor] = useState('ink');
  const [width, setWidth] = useState(2);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WhiteboardElement | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [myIds, setMyIds] = useState<string[]>([]);

  const drag = useRef<{
    mode: 'draw' | 'move' | 'pan' | 'erase';
    startX: number;
    startY: number;
    orig?: WhiteboardElement;
    lastEmit: number;
    viewStart?: typeof view;
  } | null>(null);
  const lastCursorEmit = useRef(0);

  // ---------- Sync ----------
  useEffect(() => {
    const onInit = (list: WhiteboardElement[]) => setElements(list);
    const onDrawn = (el: WhiteboardElement) =>
      setElements((prev) => (prev.some((e) => e.id === el.id) ? prev.map((e) => (e.id === el.id ? el : e)) : [...prev, el]));
    const onDeleted = (id: string) => setElements((prev) => prev.filter((e) => e.id !== id));
    const onCleared = () => setElements([]);
    const onCursor = (c: Omit<RemoteCursor, 'at'>) => setCursors((prev) => ({ ...prev, [c.userId]: { ...c, at: Date.now() } }));
    socket.on('init:whiteboard', onInit);
    socket.on('whiteboard:drawn', onDrawn);
    socket.on('whiteboard:deleted', onDeleted);
    socket.on('whiteboard:cleared', onCleared);
    socket.on('whiteboard:cursor', onCursor);
    socket.emit('whiteboard:get-state');
    const sweep = setInterval(() => setCursors((prev) => Object.fromEntries(Object.entries(prev).filter(([, c]) => Date.now() - c.at < 5000))), 2000);
    return () => {
      socket.off('init:whiteboard', onInit);
      socket.off('whiteboard:drawn', onDrawn);
      socket.off('whiteboard:deleted', onDeleted);
      socket.off('whiteboard:cleared', onCleared);
      socket.off('whiteboard:cursor', onCursor);
      clearInterval(sweep);
    };
  }, []);

  // ---------- Size ----------
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---------- Render ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.w) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    // Dot grid
    const gap = 24 * view.scale;
    if (gap > 8) {
      ctx.fillStyle = resolveColor('line-strong');
      const ox = ((view.x % gap) + gap) % gap;
      const oy = ((view.y % gap) + gap) % gap;
      for (let x = ox; x < size.w; x += gap) for (let y = oy; y < size.h; y += gap) ctx.fillRect(x, y, 1.2, 1.2);
    }

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);
    const all = draft ? [...elements.filter((e) => e.id !== draft.id), draft] : elements;
    all.forEach((el) => drawElement(ctx, el));

    const sel = elements.find((e) => e.id === selectedId);
    if (sel) {
      const b = bounds(sel);
      ctx.strokeStyle = resolveColor('accent');
      ctx.lineWidth = 1 / view.scale;
      ctx.setLineDash([4 / view.scale, 4 / view.scale]);
      ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
      ctx.setLineDash([]);
    }
    ctx.restore();
  }, [elements, draft, size, view, selectedId, theme]);

  // ---------- Coordinates ----------
  const toWorld = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left - view.x) / view.scale, y: (e.clientY - rect.top - view.y) / view.scale };
  };
  const topAt = (x: number, y: number) => [...elements].reverse().find((el) => hitTest(el, x, y, 6 / view.scale));

  const commit = (el: WhiteboardElement) => {
    setElements((prev) => (prev.some((e) => e.id === el.id) ? prev.map((e) => (e.id === el.id ? el : e)) : [...prev, el]));
    socket.emit('whiteboard:draw', el);
  };
  const remove = useCallback((id: string) => {
    setElements((prev) => prev.filter((e) => e.id !== id));
    socket.emit('whiteboard:delete', id);
  }, []);

  // ---------- Pointer ----------
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (textInput) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = toWorld(e);

    if (e.button === 1 || (e.shiftKey && tool === 'select')) {
      drag.current = { mode: 'pan', startX: e.clientX, startY: e.clientY, lastEmit: 0, viewStart: view };
      return;
    }
    if (tool === 'select') {
      const hit = topAt(p.x, p.y);
      setSelectedId(hit?.id || null);
      drag.current = hit
        ? { mode: 'move', startX: p.x, startY: p.y, orig: hit, lastEmit: 0 }
        : { mode: 'pan', startX: e.clientX, startY: e.clientY, lastEmit: 0, viewStart: view };
      return;
    }
    if (tool === 'eraser') {
      drag.current = { mode: 'erase', startX: p.x, startY: p.y, lastEmit: 0 };
      const hit = topAt(p.x, p.y);
      if (hit) remove(hit.id);
      return;
    }
    if (tool === 'text') {
      setTextInput({ x: p.x, y: p.y, value: '' });
      return;
    }
    const base: WhiteboardElement = {
      id: uid(),
      type: tool as WhiteboardElement['type'],
      x: p.x,
      y: p.y,
      width: 0,
      height: 0,
      color,
      strokeWidth: width,
      createdBy: user.id,
      username: user.username,
    };
    if (tool === 'pen') base.points = [0, 0];
    setDraft(base);
    setSelectedId(null);
    drag.current = { mode: 'draw', startX: p.x, startY: p.y, lastEmit: 0 };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toWorld(e);
    const now = Date.now();
    if (now - lastCursorEmit.current > 60) {
      lastCursorEmit.current = now;
      socket.emit('whiteboard:cursor', { x: p.x, y: p.y });
    }
    const d = drag.current;
    if (!d) return;

    if (d.mode === 'pan' && d.viewStart) {
      setView({ ...d.viewStart, x: d.viewStart.x + (e.clientX - d.startX), y: d.viewStart.y + (e.clientY - d.startY) });
    } else if (d.mode === 'erase') {
      const hit = topAt(p.x, p.y);
      if (hit) remove(hit.id);
    } else if (d.mode === 'move' && d.orig) {
      const moved = { ...d.orig, x: d.orig.x + (p.x - d.startX), y: d.orig.y + (p.y - d.startY) };
      setElements((prev) => prev.map((el) => (el.id === moved.id ? moved : el)));
      if (now - d.lastEmit > 50) {
        d.lastEmit = now;
        socket.emit('whiteboard:draw', moved);
      }
    } else if (d.mode === 'draw' && draft) {
      let next: WhiteboardElement;
      if (draft.type === 'pen') {
        next = { ...draft, points: [...(draft.points || []), p.x - draft.x, p.y - draft.y] };
      } else {
        let w = p.x - d.startX;
        let h = p.y - d.startY;
        if (e.shiftKey && (draft.type === 'rectangle' || draft.type === 'circle')) {
          const s = Math.max(Math.abs(w), Math.abs(h));
          w = Math.sign(w || 1) * s;
          h = Math.sign(h || 1) * s;
        }
        next = { ...draft, width: w, height: h };
      }
      setDraft(next);
      if (now - d.lastEmit > 60 && draft.type === 'pen') {
        d.lastEmit = now;
        socket.emit('whiteboard:draw', next);
      }
    }
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.mode === 'move') {
      const el = elements.find((x) => x.id === d.orig?.id);
      if (el) socket.emit('whiteboard:draw', el);
    }
    if (d.mode === 'draw' && draft) {
      let el = draft;
      const tiny = el.type === 'pen' ? (el.points?.length || 0) < 4 : Math.abs(el.width) < 3 && Math.abs(el.height) < 3;
      if (tiny && el.type !== 'pen') {
        setDraft(null);
        return;
      }
      if (el.type === 'rectangle' || el.type === 'circle') {
        el = {
          ...el,
          x: Math.min(el.x, el.x + el.width),
          y: Math.min(el.y, el.y + el.height),
          width: Math.abs(el.width),
          height: Math.abs(el.height),
        };
      }
      commit(el);
      setMyIds((ids) => [...ids, el.id]);
      setDraft(null);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const scale = Math.min(3, Math.max(0.25, view.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
      setView({ scale, x: mx - ((mx - view.x) / view.scale) * scale, y: my - ((my - view.y) / view.scale) * scale });
    } else {
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  };

  // Ctrl+wheel zoom needs a non-passive listener to stop the browser zooming the page.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => (e.ctrlKey || e.metaKey) && e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  const zoomBy = (f: number) => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    const scale = Math.min(3, Math.max(0.25, view.scale * f));
    setView({ scale, x: cx - ((cx - view.x) / view.scale) * scale, y: cy - ((cy - view.y) / view.scale) * scale });
  };

  const undo = useCallback(() => {
    setMyIds((ids) => {
      const remaining = ids.filter((id) => elements.some((e) => e.id === id));
      const last = remaining[remaining.length - 1];
      if (last) remove(last);
      return remaining.slice(0, -1);
    });
  }, [elements, remove]);

  const exportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = resolveColor('surface');
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, 0, 0);
    const a = document.createElement('a');
    a.download = `lemo-board-${new Date().toISOString().slice(0, 10)}.png`;
    a.href = out.toDataURL('image/png');
    a.click();
  };

  // ---------- Keyboard ----------
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        remove(selectedId);
        setSelectedId(null);
        return;
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        setDraft(null);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = TOOLS.find((x) => x.key === e.key.toLowerCase());
      if (t) setTool(t.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, selectedId, undo, remove]);

  const commitText = () => {
    if (textInput && textInput.value.trim()) {
      const el: WhiteboardElement = {
        id: uid(),
        type: 'text',
        x: textInput.x,
        y: textInput.y,
        width: 0,
        height: 0,
        color,
        text: textInput.value.trim(),
        createdBy: user.id,
        username: user.username,
      };
      commit(el);
      setMyIds((ids) => [...ids, el.id]);
    }
    setTextInput(null);
  };

  const cursorStyle = tool === 'select' ? 'default' : tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair';

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-surface">
      <ViewHeader
        title="Whiteboard"
        subtitle={`${elements.length} ${elements.length === 1 ? 'shape' : 'shapes'} · shared with everyone · scroll to pan, Ctrl + scroll to zoom`}
        actions={
          <>
            <IconButton label="Undo your last shape (Ctrl Z)" onClick={undo} disabled={myIds.length === 0}>
              <Undo2 size={16} />
            </IconButton>
            <IconButton label="Download as PNG" onClick={exportPng}>
              <Download size={16} />
            </IconButton>
            <IconButton
              label="Clear the board for everyone"
              className="hover:text-err"
              onClick={() =>
                elements.length && confirm('Clear the whole board for everyone? This cannot be undone.') && socket.emit('whiteboard:clear')
              }
            >
              <Trash2 size={16} />
            </IconButton>
          </>
        }
      />
      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden bg-canvas" onWheel={onWheel}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          style={{ width: size.w, height: size.h, cursor: cursorStyle }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Shared whiteboard canvas"
          role="img"
        />

        {textInput && (
          <input
            autoFocus
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitText();
              if (e.key === 'Escape') setTextInput(null);
            }}
            placeholder="Type, then Enter"
            className="absolute rounded border border-dashed border-line-strong bg-surface/90 px-1 text-[16px] font-medium outline-none"
            style={{
              left: textInput.x * view.scale + view.x,
              top: textInput.y * view.scale + view.y - 2,
              color: resolveColor(color),
              transformOrigin: 'top left',
              transform: `scale(${view.scale})`,
            }}
          />
        )}

        {Object.values(cursors).map((c) => (
          <div
            key={c.userId}
            className="pointer-events-none absolute transition-transform duration-75"
            style={{ transform: `translate(${c.x * view.scale + view.x}px, ${c.y * view.scale + view.y}px)` }}
          >
            <MousePointer2 size={16} className="fill-accent text-accent" />
            <span className="ml-3 rounded-md bg-ink px-1.5 py-0.5 font-mono text-[10px] text-inverse">{c.username}</span>
          </div>
        ))}

        {/* Toolbar */}
        <div className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-pop">
          {TOOLS.map(({ id, label, key, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              aria-pressed={tool === id}
              title={`${label}  ${key.toUpperCase()}`}
              aria-label={label}
              className={cx(
                'relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                tool === id ? 'bg-ink text-inverse' : 'text-ink-2 hover:bg-subtle hover:text-ink',
              )}
            >
              <Icon size={15} />
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-line" />
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.id)}
              aria-label={c.label}
              aria-pressed={color === c.id}
              title={c.label}
              className={cx('flex h-8 w-6 items-center justify-center rounded-md', color === c.id && 'bg-subtle')}
            >
              <span
                className={cx('block h-3.5 w-3.5 rounded-full', color === c.id && 'ring-2 ring-line-strong ring-offset-1 ring-offset-surface')}
                style={{ background: c.id.startsWith('#') ? c.id : `var(--c-${c.id})` }}
              />
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <div className="hidden items-center sm:flex">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWidth(w)}
                aria-label={`Stroke ${w}px`}
                aria-pressed={width === w}
                className={cx('flex h-8 w-7 items-center justify-center rounded-md', width === w ? 'bg-subtle' : 'hover:bg-subtle')}
              >
                <span className="block rounded-full bg-ink" style={{ width: 14, height: w }} />
              </button>
            ))}
          </div>
        </div>

        {/* Zoom */}
        <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shadow-pop">
          <IconButton label="Zoom out" className="h-7 w-7" onClick={() => zoomBy(0.8)}>
            <ZoomOut size={14} />
          </IconButton>
          <button
            type="button"
            onClick={() => setView({ x: 0, y: 0, scale: 1 })}
            className="h-7 min-w-12 rounded-md px-1 font-mono text-[11px] text-ink-2 hover:bg-subtle"
            title="Reset view"
          >
            {Math.round(view.scale * 100)}%
          </button>
          <IconButton label="Zoom in" className="h-7 w-7" onClick={() => zoomBy(1.25)}>
            <Plus size={14} />
          </IconButton>
          <IconButton label="Reset view" className="h-7 w-7" onClick={() => setView({ x: 0, y: 0, scale: 1 })}>
            <Scan size={14} />
          </IconButton>
        </div>

        {elements.length === 0 && !draft && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="font-display text-[18px] font-semibold text-ink-2">An empty board</p>
              <p className="mt-1 text-[13px] text-ink-3">Pick a tool above, or press R for a rectangle. Everyone here sees it live.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
