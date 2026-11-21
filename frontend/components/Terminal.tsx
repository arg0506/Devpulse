import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { socket } from '../socket';
import { useWorkspace } from '../lib/workspace';

interface Line {
  text: string;
  kind: 'input' | 'output' | 'error' | 'pending';
}

const TONES: Record<string, string> = {
  accent: '#ff8a90',
  ok: '#4fd69c',
  warn: '#f0b955',
  err: '#ff7d87',
  muted: '#7d8390',
};

/** Renders the server's [[tone]text] markup. */
function formatLine(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\[\[(accent|ok|warn|err|muted)\]([^\]]*)\]/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    out.push(
      <span key={i++} style={{ color: TONES[m[1]] }}>
        {m[2]}
      </span>,
    );
    last = idx + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const SUGGESTIONS = ['help', 'whoami', 'users', 'stats', 'events', 'ai '];

export default function Terminal({ onClose }: { onClose: () => void }) {
  const { user } = useWorkspace();
  const [lines, setLines] = useState<Line[]>([{ text: 'DevPulse console. Type [[accent]help] for commands.', kind: 'output' }]);
  const [value, setValue] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const [height, setHeight] = useState(() => Number(localStorage.getItem('devpulse_console_h')) || 260);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onResponse = (data: { output: string; isError?: boolean; isPending?: boolean }) => {
      if (data.output === 'CLEAR_CONSOLE') return setLines([]);
      setLines((prev) => [
        ...prev.filter((l) => l.kind !== 'pending'),
        { text: data.output, kind: data.isPending ? 'pending' : data.isError ? 'error' : 'output' },
      ]);
    };
    socket.on('terminal:response', onResponse);
    return () => {
      socket.off('terminal:response', onResponse);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lines]);

  const run = (cmd: string) => {
    const c = cmd.trim();
    if (!c) return;
    setLines((prev) => [...prev, { text: c, kind: 'input' }]);
    setHistory((h) => [c, ...h.filter((x) => x !== c)].slice(0, 50));
    setCursor(-1);
    setValue('');
    socket.emit('terminal:command', { command: c });
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(cursor + 1, history.length - 1);
      if (history[next] !== undefined) {
        setCursor(next);
        setValue(history[next]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = cursor - 1;
      setCursor(Math.max(next, -1));
      setValue(next >= 0 ? history[next] : '');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const match = SUGGESTIONS.find((s) => s.startsWith(value) && s !== value);
      if (match) setValue(match);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const startResize = (e: React.PointerEvent) => {
    const startY = e.clientY;
    const startH = height;
    const move = (ev: PointerEvent) => setHeight(Math.min(Math.max(startH + (startY - ev.clientY), 140), window.innerHeight * 0.7));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setHeight((h) => {
        try {
          localStorage.setItem('devpulse_console_h', String(Math.round(h)));
        } catch {
          /* ignore */
        }
        return h;
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <section aria-label="Console" className="relative flex flex-shrink-0 flex-col bg-console text-console-ink" style={{ height }}>
      <div onPointerDown={startResize} className="absolute inset-x-0 -top-1 h-2 cursor-row-resize" aria-hidden="true" />
      <div className="flex h-9 flex-shrink-0 items-center justify-between border-b border-white/8 px-3">
        <div className="flex items-center gap-3 font-mono text-[11px] text-[#7d8390]">
          <span className="text-[#c9ced8]">console</span>
          <span>@{user.username}</span>
          <span className="hidden sm:inline">↑↓ history · tab complete · ctrl+l clear</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close console" className="rounded p-1 text-[#7d8390] hover:bg-white/8 hover:text-white">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-[1.7]" onClick={() => inputRef.current?.focus()}>
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {l.kind === 'input' ? (
              <>
                <span className="text-[#ff8a90]">❯ </span>
                <span className="text-white">{l.text}</span>
              </>
            ) : (
              <span className={l.kind === 'error' ? 'text-[#ff7d87]' : l.kind === 'pending' ? 'animate-blink text-[#7d8390]' : ''}>
                {formatLine(l.text)}
              </span>
            )}
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(value);
          }}
          className="flex items-center"
        >
          <span className="text-[#ff8a90]">❯&nbsp;</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
            autoComplete="off"
            aria-label="Console command"
            className="flex-1 bg-transparent text-white caret-[#ff8a90] outline-none"
          />
        </form>
        <div ref={endRef} />
      </div>
    </section>
  );
}
