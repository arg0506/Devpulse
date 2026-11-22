import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Flame, Hash, Search, Sparkles, Trophy } from 'lucide-react';
import { useWorkspace, channelLabel } from '../lib/workspace';
import { Avatar, cx } from './ui';

// Activity is bucketed into 15 slices of 20 seconds, so the chart covers the last five minutes.
const BUCKETS = 15;
const BUCKET_MS = 20000;

function greeting(date: Date): string {
  const h = date.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** A plain line through the values, with no axes, in the style of the reference's price charts. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 300;
  const H = 110;
  const max = Math.max(1, ...values);
  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - (v / max) * (H - 12) - 6;
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function OverviewView() {
  const { user, channels, presences, presenceOf, beats, unread, openChannel, setView, setPaletteOpen, setSettingsOpen } = useWorkspace();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Messages per 20-second slice over the last five minutes.
  const values = useMemo(() => {
    const out = new Array<number>(BUCKETS).fill(0);
    for (const t of beats) {
      const idx = BUCKETS - 1 - Math.floor((now - t) / BUCKET_MS);
      if (idx >= 0 && idx < BUCKETS) out[idx]++;
    }
    return out;
  }, [beats, now]);

  const recent = values.reduce((a, b) => a + b, 0);
  const rooms = channels.filter((c) => c.category === 'Channels' || c.category === 'Guilds');
  const dms = channels.filter((c) => c.category === 'Direct Messages');
  const online = presences.filter((p) => p.status !== 'offline' && !['system-bot', 'gemini-bot'].includes(p.userId));
  const unreadTotal = Object.values(unread).reduce((a, b) => a + b, 0);
  const xp = presenceOf(user.id)?.xpPoints ?? user.xpPoints;

  const openAndGo = (id: string) => {
    openChannel(id);
    setView('chat');
  };

  // Favourites take the palette in turn, the way the reference cycles its coin cards.
  const FAVOURITE_STYLE = [
    { bg: '#6d2dff', fg: '#ffffff' },
    { bg: '#ffb84d', fg: '#0a0b0d' },
    { bg: '#ff6670', fg: '#0a0b0d' },
    { bg: '#0d0e12', fg: '#eceef2' },
  ];

  return (
    <div className="grid h-full min-h-0 w-full gap-3 overflow-y-auto p-3 lg:grid-cols-[1fr_320px]">
      {/* Main column */}
      <div className="flex min-w-0 flex-col gap-3 rounded-3xl bg-[#101114] p-5 md:p-7">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[12px] text-ink-3">{greeting(new Date(now))}, {user.username}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex h-10 w-56 items-center gap-2 rounded-full bg-[#0a0b0d] px-4 text-[13px] text-ink-3 transition-colors hover:text-ink"
            >
              <Search size={15} /> Search channels, people
            </button>
            <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Profile and settings" className="rounded-full">
              <Avatar emoji={user.avatarEmoji} size={40} status={presenceOf(user.id)?.status || 'online'} />
            </button>
          </div>
        </div>

        <div className="mt-2">
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Active · last 5 minutes</p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <p className="font-display text-[64px] leading-none font-bold tracking-[-0.04em] md:text-[88px]">{recent}</p>
            <span className="mb-2 rounded-full bg-[#3ddc97]/15 px-3 py-1 font-mono text-[12px] text-[#3ddc97]">
              {online.length} online now
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Favorites</p>
          <button type="button" onClick={() => setView('chat')} className="font-mono text-[12px] text-ink-2 hover:text-ink">
            see all
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {rooms.slice(0, 4).map((c, i) => {
            const style = FAVOURITE_STYLE[i % FAVOURITE_STYLE.length];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => openAndGo(c.id)}
                className="group flex min-h-[170px] flex-col justify-between rounded-2xl p-4 text-left transition-transform hover:-translate-y-1"
                style={{ backgroundColor: style.bg, color: style.fg }}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/20">
                    <Hash size={16} />
                  </span>
                  <ArrowUpRight size={16} className="opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] opacity-70">{c.description || 'Open the channel'}</p>
                </div>
                {(unread[c.id] || 0) > 0 && (
                  <span className="mt-3 w-fit rounded-full bg-black/25 px-2 py-0.5 font-mono text-[11px]">{unread[c.id]} new</span>
                )}
              </button>
            );
          })}
          {rooms.length === 0 && <p className="col-span-full text-[13px] text-ink-3">No channels yet.</p>}
        </div>

        <p className="mt-4 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Insights</p>
        <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex min-h-[230px] flex-col rounded-2xl border border-line bg-[#0a0b0d] p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Messages</p>
              <span className="rounded-full bg-[#ff6670]/15 px-2.5 py-1 font-mono text-[11px] text-[#ff6670]">{recent} in 5m</span>
            </div>
            <div className="mt-4 min-h-0 flex-1">
              <Sparkline values={values} color="#ffb84d" />
            </div>
            <div className="mt-3 flex justify-between font-mono text-[10px] text-ink-3">
              <span>-5m</span>
              <span>now</span>
            </div>
          </div>

          <div className="flex min-h-[230px] flex-col rounded-2xl border border-line bg-[#0a0b0d] p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Team</p>
              <span className="font-mono text-[12px] text-ink-3">{presences.length} members</span>
            </div>
            <ul className="mt-4 space-y-3 overflow-y-auto">
              {presences.slice(0, 6).map((p) => (
                <li key={p.userId} className="flex items-center gap-3">
                  <Avatar emoji={p.avatarEmoji} size={30} status={p.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{p.username}</p>
                    <p className="truncate text-[11.5px] text-ink-3">{p.role}</p>
                  </div>
                  <span className={cx('font-mono text-[11px]', p.status === 'offline' ? 'text-ink-3' : 'text-[#3ddc97]')}>{p.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Side column */}
      <div className="flex min-w-0 flex-col gap-3">
        <div className="rounded-3xl border border-line bg-surface p-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Channels</p>
            {unreadTotal > 0 && <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] font-semibold text-white">{unreadTotal}</span>}
          </div>
          <ul className="space-y-1">
            {rooms.slice(0, 5).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openAndGo(c.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-subtle"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-subtle">
                    <Hash size={15} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{c.name}</span>
                  {(unread[c.id] || 0) > 0 && <span className="font-mono text-[12px] text-accent">{unread[c.id]}</span>}
                </button>
              </li>
            ))}
            {dms.slice(0, 3).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openAndGo(c.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-subtle"
                >
                  <Avatar emoji={presenceOf((c.members || []).find((m) => m !== user.id) || '')?.avatarEmoji || '👤'} size={30} />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{channelLabel(c, user.id, presenceOf)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 text-[#0a0b0d]" style={{ backgroundColor: '#ff8a5c' }}>
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0a0b0d] text-white">
              <Trophy size={18} />
            </span>
            <span className="flex items-center gap-1 rounded-full bg-[#0a0b0d]/15 px-2.5 py-1 font-mono text-[11px]">
              <Flame size={12} /> {user.streakCount}d streak
            </span>
          </div>
          <p className="mt-6 text-[13px] font-medium opacity-80">Your XP</p>
          <p className="font-display text-[44px] leading-none font-bold tracking-[-0.03em]">{xp}</p>
        </div>

        <div className="flex flex-1 flex-col rounded-3xl p-5 text-[#0a0b0d]" style={{ backgroundColor: '#3ddc97' }}>
          <div className="flex items-center justify-between">
            <p className="font-semibold">Jump in</p>
            <Sparkles size={18} />
          </div>
          <div className="mt-4 space-y-2">
            {rooms.slice(0, 3).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openAndGo(c.id)}
                className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-[13px] font-medium"
              >
                <span className="truncate">#{c.name}</span>
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setView('chat')}
            className="mt-auto rounded-2xl bg-[#0a0b0d] py-3 text-[14px] font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Open chat
          </button>
        </div>
      </div>
    </div>
  );
}
