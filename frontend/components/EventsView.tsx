import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Video, MessagesSquare, CalendarDays, Check } from 'lucide-react';
import { api } from '../lib/api';
import { socket } from '../socket';
import { useWorkspace } from '../lib/workspace';
import { DevChannel, DevCommunity, DevEvent } from '../types';
import { eventDate, relativeFromNow } from '../lib/format';
import { Avatar, Badge, Button, EmptyState, Modal, Segmented, ViewHeader, cx } from './ui';

function defaultStart(): string {
  const d = new Date(Date.now() + 86400000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export default function EventsView() {
  const { user, presences, openChannel } = useWorkspace();
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [communities, setCommunities] = useState<DevCommunity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: defaultStart(), meetLink: '', communityId: 'comm-global' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api<DevEvent[]>('/api/events'), api<DevCommunity[]>('/api/communities')])
      .then(([evts, comms]) => {
        setEvents(evts);
        setCommunities(comms);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    const onNew = (e: DevEvent) => setEvents((prev) => (prev.some((x) => x.id === e.id) ? prev : [...prev, e]));
    const onRsvp = ({ eventId, rsvps }: { eventId: string; rsvps: string[] }) =>
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, rsvps } : e)));
    socket.on('event:new', onNew);
    socket.on('event:rsvp-update', onRsvp);
    return () => {
      socket.off('event:new', onNew);
      socket.off('event:rsvp-update', onRsvp);
    };
  }, []);

  const list = useMemo(() => {
    const cutoff = Date.now() - 2 * 3600000; // events stay "upcoming" for two hours after they start
    const sorted = [...events].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    return scope === 'upcoming' ? sorted.filter((e) => Date.parse(e.date) >= cutoff) : sorted.filter((e) => Date.parse(e.date) < cutoff).reverse();
  }, [events, scope]);

  const selected = list.find((e) => e.id === selectedId) || list[0];
  const going = !!selected && selected.rsvps.includes(user.username);
  const community = communities.find((c) => c.id === selected?.communityId);

  const toggleRsvp = async () => {
    if (!selected) return;
    setRsvpBusy(true);
    try {
      const updated = await api<DevEvent>(`/api/events/${selected.id}/rsvp`, { method: 'POST' });
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } finally {
      setRsvpBusy(false);
    }
  };

  const openDiscussion = () => {
    if (!selected) return;
    socket.emit('event:open-channel', { eventId: selected.id }, (res: { channel?: DevChannel }) => {
      if (res?.channel) openChannel(res.channel.id);
    });
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await api<DevEvent>('/api/events', { body: { ...form, date: new Date(form.date).toISOString() } });
      setEvents((prev) => (prev.some((x) => x.id === created.id) ? prev : [...prev, created]));
      setScope('upcoming');
      setSelectedId(created.id);
      setModal(false);
      setForm({ title: '', description: '', date: defaultStart(), meetLink: '', communityId: 'comm-global' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const attendee = (username: string) => presences.find((p) => p.username === username);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-canvas">
      <ViewHeader
        title="Events"
        subtitle="Workshops, hackathons and calls"
        actions={
          <Button size="sm" variant="primary" onClick={() => setModal(true)}>
            <Plus size={14} /> New event
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex max-h-[40vh] flex-col border-b border-line bg-surface md:max-h-none md:w-[340px] md:border-r md:border-b-0">
          <div className="p-3">
            <Segmented<'upcoming' | 'past'>
              value={scope}
              onChange={setScope}
              options={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'past', label: 'Past' },
              ]}
            />
          </div>
          <ul className="flex-1 overflow-y-auto px-2 pb-2">
            {loading && <li className="px-2 py-3 text-[13px] text-ink-3">Loading events…</li>}
            {!loading && list.length === 0 && (
              <li className="px-2 py-3 text-[13px] text-ink-3">{scope === 'upcoming' ? 'Nothing scheduled yet.' : 'No past events.'}</li>
            )}
            {list.map((e) => {
              const d = eventDate(e.date);
              const active = selected?.id === e.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(e.id)}
                    className={cx(
                      'flex w-full gap-3 rounded-lg px-2 py-2.5 text-left transition-colors',
                      active ? 'bg-subtle' : 'hover:bg-subtle/70',
                    )}
                  >
                    <span className="flex w-11 flex-shrink-0 flex-col items-center rounded-md border border-line bg-surface py-1">
                      <span className="font-mono text-[10px] text-accent uppercase">{d.month}</span>
                      <span className="font-display text-[17px] leading-tight font-semibold">{d.day}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">{e.title}</span>
                      <span className="block text-[12px] text-ink-3">
                        {d.weekday} · {d.time} · {e.rsvps.length} going
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto">
          {!selected ? (
            !loading && (
              <EmptyState
                icon={<CalendarDays size={22} />}
                title="Pick an event"
                body="Or schedule one for your team."
                action={
                  <Button variant="primary" onClick={() => setModal(true)}>
                    New event
                  </Button>
                }
              />
            )
          ) : (
            <article key={selected.id} className="animate-fade-up mx-auto max-w-2xl px-5 py-8 md:px-10 md:py-12">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={Date.parse(selected.date) > Date.now() ? 'accent' : 'neutral'}>{relativeFromNow(selected.date)}</Badge>
                {community && <Badge>{community.name}</Badge>}
              </div>
              <h2 className="mt-4 font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.025em]">{selected.title}</h2>
              <p className="mt-2 text-[14px] text-ink-2">{eventDate(selected.date).full}</p>
              <p className="mt-1 text-[13px] text-ink-3">Hosted by @{selected.creator}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant={going ? 'secondary' : 'primary'} loading={rsvpBusy} onClick={toggleRsvp}>
                  {going ? (
                    <>
                      <Check size={14} /> Going · cancel
                    </>
                  ) : (
                    'RSVP'
                  )}
                </Button>
                {selected.meetLink && (
                  <a
                    href={selected.meetLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-[13px] font-medium hover:border-line-strong hover:bg-subtle"
                  >
                    <Video size={14} /> Join call
                  </a>
                )}
                <Button onClick={openDiscussion}>
                  <MessagesSquare size={14} /> Discussion
                </Button>
              </div>

              {selected.description && <p className="mt-8 max-w-prose text-[14.5px] leading-relaxed text-ink-2">{selected.description}</p>}

              <section className="mt-10">
                <h3 className="eyebrow">{selected.rsvps.length} going</h3>
                {selected.rsvps.length === 0 ? (
                  <p className="mt-2 text-[13px] text-ink-3">Be the first to RSVP.</p>
                ) : (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {selected.rsvps.map((u) => {
                      const p = attendee(u);
                      return (
                        <li key={u} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pr-3 pl-1">
                          <Avatar emoji={p?.avatarEmoji || '👤'} size={22} status={p?.status} />
                          <span className="text-[12.5px] text-ink-2">{u}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </article>
          )}
        </div>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New event"
        width={480}
        footer={
          <>
            <Button onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="event-form" loading={saving} disabled={!form.title.trim()}>
              Schedule event
            </Button>
          </>
        }
      >
        <form id="event-form" onSubmit={create} className="space-y-3">
          <div>
            <label className="label" htmlFor="ev-title">
              Title
            </label>
            <input id="ev-title" className="field" maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ev-date">
                Starts
              </label>
              <input
                id="ev-date"
                type="datetime-local"
                className="field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="ev-comm">
                Community
              </label>
              <select id="ev-comm" className="field" value={form.communityId} onChange={(e) => setForm({ ...form, communityId: e.target.value })}>
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ev-link">
              Call link <span className="font-normal text-ink-3">· optional</span>
            </label>
            <input
              id="ev-link"
              type="url"
              className="field"
              placeholder="https://meet.google.com/…"
              value={form.meetLink}
              onChange={(e) => setForm({ ...form, meetLink: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="ev-desc">
              Description
            </label>
            <textarea
              id="ev-desc"
              rows={3}
              className="field resize-none"
              maxLength={500}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {error && <p className="text-[12.5px] text-err">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}
