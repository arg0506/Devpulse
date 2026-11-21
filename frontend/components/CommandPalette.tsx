import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Hash, MessagesSquare, Users, CalendarDays, PenTool, Workflow, SquareTerminal, SunMoon, User, CornerDownLeft } from 'lucide-react';
import { useWorkspace, channelLabel } from '../lib/workspace';
import { Avatar, Kbd, cx } from './ui';

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

export default function CommandPalette() {
  const {
    paletteOpen,
    setPaletteOpen,
    channels,
    presences,
    openChannel,
    openDM,
    setView,
    toggleConsole,
    toggleTheme,
    user,
    presenceOf,
    setSettingsOpen,
  } = useWorkspace();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [paletteOpen]);

  const items = useMemo<Item[]>(() => {
    const close = (fn: () => void) => () => {
      fn();
      setPaletteOpen(false);
    };
    const all: Item[] = [
      ...channels
        .filter((c) => c.category !== 'Events')
        .map((c) => ({
          id: 'c-' + c.id,
          group: 'Channels',
          label: c.category === 'Direct Messages' ? channelLabel(c, user.id, presenceOf) : c.name,
          hint: c.category === 'Direct Messages' ? 'direct message' : c.description,
          icon: c.category === 'Direct Messages' ? <MessagesSquare size={15} /> : <Hash size={15} />,
          run: close(() => openChannel(c.id)),
        })),
      ...presences
        .filter((p) => p.userId !== user.id && p.userId !== 'system-bot')
        .map((p) => ({
          id: 'p-' + p.userId,
          group: 'People',
          label: p.username,
          hint: p.role,
          icon: <Avatar emoji={p.avatarEmoji} size={18} status={p.status} />,
          run: close(() => openDM(p.userId)),
        })),
      { id: 'v-chat', group: 'Go to', label: 'Chat', icon: <MessagesSquare size={15} />, run: close(() => setView('chat')) },
      { id: 'v-comm', group: 'Go to', label: 'Communities', icon: <Users size={15} />, run: close(() => setView('communities')) },
      { id: 'v-events', group: 'Go to', label: 'Events', icon: <CalendarDays size={15} />, run: close(() => setView('events')) },
      { id: 'v-board', group: 'Go to', label: 'Whiteboard', icon: <PenTool size={15} />, run: close(() => setView('board')) },
      { id: 'v-agents', group: 'Go to', label: 'Agent studio', icon: <Workflow size={15} />, run: close(() => setView('agents')) },
      { id: 'a-console', group: 'Actions', label: 'Toggle console', hint: 'Ctrl `', icon: <SquareTerminal size={15} />, run: close(toggleConsole) },
      { id: 'a-theme', group: 'Actions', label: 'Switch light / dark theme', icon: <SunMoon size={15} />, run: close(toggleTheme) },
      { id: 'a-profile', group: 'Actions', label: 'Edit profile', icon: <User size={15} />, run: close(() => setSettingsOpen(true)) },
    ];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((i) => i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q) || i.group.toLowerCase().includes(q));
  }, [channels, presences, query, user.id, presenceOf, openChannel, openDM, setView, toggleConsole, toggleTheme, setPaletteOpen, setSettingsOpen]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  if (!paletteOpen) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[index]?.run();
    } else if (e.key === 'Escape') {
      setPaletteOpen(false);
    }
  };

  let lastGroup = '';
  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-ink/25 p-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={() => setPaletteOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Search"
        className="animate-fade-up w-full max-w-[560px] overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Jump to a channel, person or action"
          className="h-12 w-full border-b border-line bg-transparent px-4 text-[14.5px] text-ink placeholder:text-ink-3 focus:outline-none"
          aria-label="Search"
        />
        <ul className="max-h-[50vh] overflow-y-auto p-1.5" role="listbox">
          {items.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-ink-3">No results for “{query}”.</li>}
          {items.map((item, i) => {
            const header = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <React.Fragment key={item.id}>
                {header && <li className="eyebrow px-2.5 pt-2.5 pb-1">{item.group}</li>}
                <li role="option" aria-selected={i === index}>
                  <button
                    type="button"
                    onMouseEnter={() => setIndex(i)}
                    onClick={item.run}
                    className={cx(
                      'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left',
                      i === index ? 'bg-subtle text-ink' : 'text-ink-2',
                    )}
                  >
                    <span className="flex w-5 justify-center text-ink-3">{item.icon}</span>
                    <span className="truncate text-[13.5px]">{item.label}</span>
                    {item.hint && <span className="truncate text-[12px] text-ink-3">{item.hint}</span>}
                    {i === index && <CornerDownLeft size={13} className="ml-auto flex-shrink-0 text-ink-3" />}
                  </button>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
        <div className="flex items-center gap-3 border-t border-line px-3 py-2 text-[11px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> move
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>↵</Kbd> open
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>esc</Kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
