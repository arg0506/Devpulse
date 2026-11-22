import React, { useEffect, useState } from 'react';
import { MessagesSquare, Users, CalendarDays, PenTool, Workflow, SquareTerminal, Sun, Moon, Search, LayoutGrid } from 'lucide-react';
import { useWorkspace, View } from '../lib/workspace';
import { Avatar, Kbd, LemoMark, cx } from './ui';
import ChatWorkspace from './ChatWorkspace';
import OverviewView from './OverviewView';
import CommunitiesView from './CommunitiesView';
import EventsView from './EventsView';
import Whiteboard from './Whiteboard';
import AgentWorkflowBuilder from './AgentWorkflowBuilder';
import Terminal from './Terminal';
import CheckoutModal from './CheckoutModal';
import CommandPalette from './CommandPalette';
import { SettingsModal, UserCardModal } from './ProfileModals';

// Each section has its own colour; the active one fills with it.
const NAV: { view: View; label: string; icon: typeof MessagesSquare; color: string }[] = [
  { view: 'overview', label: 'Overview', icon: LayoutGrid, color: '#ff6670' },
  { view: 'chat', label: 'Chat', icon: MessagesSquare, color: '#ffd23f' },
  { view: 'communities', label: 'Communities', icon: Users, color: '#ff8fc7' },
  { view: 'events', label: 'Events', icon: CalendarDays, color: '#3ddc97' },
  { view: 'board', label: 'Whiteboard', icon: PenTool, color: '#7cc4ff' },
  { view: 'agents', label: 'Agent studio', icon: Workflow, color: '#b49cff' },
];

function Rail() {
  const { view, setView, unread, consoleOpen, toggleConsole, theme, toggleTheme, user, presenceOf, setSettingsOpen, setPaletteOpen } = useWorkspace();
  const hasUnread = Object.values(unread).some((n) => n > 0);
  const status = presenceOf(user.id)?.status || 'online';

  return (
    <nav aria-label="Workspace" className="m-2 flex w-14 flex-shrink-0 flex-col items-center justify-between rounded-full border border-line bg-surface py-3">
      <div className="flex flex-col items-center gap-1">
        <div className="mb-3">
          <LemoMark size={28} />
        </div>
        {NAV.map(({ view: v, label, icon: Icon, color }) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-label={label}
            aria-current={view === v ? 'page' : undefined}
            title={label}
            style={view === v ? { backgroundColor: color } : undefined}
            className={cx(
              'relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 hover:-translate-y-0.5',
              view === v ? 'scale-110 text-[#0a0b0d] shadow-[0_6px_18px_-6px_rgba(0,0,0,0.8)]' : 'text-ink-3 hover:bg-subtle hover:text-ink',
            )}
          >
            <Icon size={18} strokeWidth={view === v ? 2.1 : 1.8} />
            {v === 'chat' && hasUnread && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search (Ctrl K)"
          title="Search  Ctrl K"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-3 hover:bg-subtle hover:text-ink"
        >
          <Search size={17} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={toggleConsole}
          aria-label="Console (Ctrl `)"
          title="Console  Ctrl `"
          aria-pressed={consoleOpen}
          className={cx(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
            consoleOpen ? 'bg-subtle text-ink' : 'text-ink-3 hover:bg-subtle hover:text-ink',
          )}
        >
          <SquareTerminal size={17} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-3 hover:bg-subtle hover:text-ink"
        >
          {theme === 'dark' ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Profile and settings"
          title="Profile and settings"
          className="mt-1 rounded-xl p-1 hover:bg-subtle"
        >
          <Avatar emoji={user.avatarEmoji} size={30} status={status} />
        </button>
      </div>
    </nav>
  );
}

/** The workspace heartbeat: a trace that spikes whenever a message lands anywhere you can see. */
function ActivityPulse() {
  const { beats, connected } = useWorkspace();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(t);
  }, []);

  const W = 96;
  const H = 16;
  const mid = H / 2 + 1;
  const windowMs = 30000;
  const xs = beats.filter((t) => now - t < windowMs).map((t) => W - ((now - t) / windowMs) * W);
  let d = `M0 ${mid}`;
  for (const x of xs.sort((a, b) => a - b)) {
    d += ` L${Math.max(0, x - 4)} ${mid} L${x - 1.5} ${mid - 6} L${x + 1.5} ${mid + 4} L${x + 3} ${mid}`;
  }
  d += ` L${W} ${mid}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="overflow-visible">
      <path
        d={d}
        fill="none"
        stroke={connected ? 'var(--c-accent)' : 'var(--c-ink-3)'}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatusBar() {
  const { connected, user, toggleConsole, setPaletteOpen, presences, presenceOf } = useWorkspace();
  const xp = presenceOf(user.id)?.xpPoints ?? user.xpPoints;
  const online = presences.filter((p) => p.status !== 'offline' && !['system-bot', 'gemini-bot'].includes(p.userId)).length;
  return (
    <footer className="flex h-7 flex-shrink-0 items-center justify-between border-t border-line bg-surface px-3 font-mono text-[11px] text-ink-3">
      <div className="flex items-center gap-3">
        <ActivityPulse />
        <span className={connected ? 'text-ink-2' : 'text-err'}>{connected ? 'live' : 'reconnecting…'}</span>
        <span className="hidden sm:inline">{online} online</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden md:inline">
          {xp} xp · {user.streakCount}d streak
        </span>
        <button type="button" onClick={() => setPaletteOpen(true)} className="hidden items-center gap-1 hover:text-ink sm:inline-flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </button>
        <button type="button" onClick={toggleConsole} className="inline-flex items-center gap-1 hover:text-ink">
          console <Kbd>Ctrl</Kbd>
          <Kbd>`</Kbd>
        </button>
      </div>
    </footer>
  );
}

export default function Shell() {
  const { view, consoleOpen, toggleConsole, checkoutPlan, openCheckout } = useWorkspace();
  // Mount views on first visit and keep them alive so unsaved work survives switching.
  const [visited, setVisited] = useState<Set<View>>(() => new Set([view]));
  useEffect(() => {
    setVisited((prev) => (prev.has(view) ? prev : new Set(prev).add(view)));
  }, [view]);

  const pane = (v: View, node: React.ReactNode) =>
    visited.has(v) && (
      <div key={v} className={cx('absolute inset-0 flex', view !== v && 'hidden')}>
        {node}
      </div>
    );

  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="flex min-h-0 flex-1">
        <Rail />
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            {pane('overview', <OverviewView />)}
            {pane('chat', <ChatWorkspace />)}
            {pane('communities', <CommunitiesView />)}
            {pane('events', <EventsView />)}
            {pane('board', <Whiteboard active={view === 'board'} />)}
            {pane('agents', <AgentWorkflowBuilder />)}
          </div>
          {consoleOpen && <Terminal onClose={toggleConsole} />}
        </main>
      </div>
      <StatusBar />

      <CommandPalette />
      <SettingsModal />
      <UserCardModal />
      {checkoutPlan && <CheckoutModal plan={checkoutPlan} onClose={() => openCheckout(null)} />}
    </div>
  );
}
