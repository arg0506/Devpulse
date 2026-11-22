import React, { useEffect, useMemo, useState } from 'react';
import { Plus, UsersRound, MessagesSquare, LogOut, LogIn, Link2 } from 'lucide-react';
import { api } from '../lib/api';
import { socket } from '../socket';
import { useWorkspace } from '../lib/workspace';
import { DevGroup } from '../types';
import { Button, EmptyState, Modal, ViewHeader, Badge } from './ui';

type GroupWithState = DevGroup & { joined: boolean; memberCount: number };

export default function GroupsView() {
  const { user, openChannel } = useWorkspace();
  const [groups, setGroups] = useState<GroupWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Membership is per user, so the server answers `joined` for the caller on every update.
  const withState = (g: DevGroup): GroupWithState => ({ ...g, joined: g.members.includes(user.id), memberCount: g.members.length });

  useEffect(() => {
    api<GroupWithState[]>('/api/groups')
      .then(setGroups)
      .catch(() => undefined)
      .finally(() => setLoading(false));
    const upsert = (g: DevGroup) =>
      setGroups((prev) => {
        const next = withState(g);
        return prev.some((x) => x.id === g.id) ? prev.map((x) => (x.id === g.id ? next : x)) : [...prev, next];
      });
    socket.on('group:new', upsert);
    socket.on('group:update', upsert);
    return () => {
      socket.off('group:new', upsert);
      socket.off('group:update', upsert);
    };
    // withState only reads user.id, which is stable for the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const mine = useMemo(() => groups.filter((g) => g.joined), [groups]);
  const discover = useMemo(() => groups.filter((g) => !g.joined), [groups]);

  const toggle = async (g: GroupWithState) => {
    setBusy(g.id);
    try {
      const updated = await api<GroupWithState>(`/api/groups/${g.id}/join`, { method: 'POST' });
      setGroups((prev) => prev.map((x) => (x.id === g.id ? updated : x)));
    } catch {
      /* the list stays as it was */
    } finally {
      setBusy(null);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await api<GroupWithState>('/api/groups', { body: form });
      setGroups((prev) => (prev.some((g) => g.id === created.id) ? prev : [...prev, created]));
      setModal(false);
      setForm({ name: '', description: '' });
      openChannel(created.channelId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const card = (g: GroupWithState) => (
    <article key={g.id} className="flex flex-col rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-[17px] font-semibold tracking-[-0.01em]">{g.name}</h2>
        {g.joined && <Badge tone="ok">Joined</Badge>}
      </div>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-2">{g.description || 'No description yet.'}</p>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
          <UsersRound size={13} /> {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
        </span>
        <div className="flex gap-2">
          {g.joined ? (
            <>
              <Button size="sm" variant="primary" onClick={() => openChannel(g.channelId)}>
                <MessagesSquare size={13} /> Open chat
              </Button>
              <Button size="sm" variant="ghost" loading={busy === g.id} onClick={() => toggle(g)} aria-label={`Leave ${g.name}`}>
                <LogOut size={13} /> Leave
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" loading={busy === g.id} onClick={() => toggle(g)}>
              <LogIn size={13} /> Join
            </Button>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-canvas">
      <ViewHeader
        title="Groups"
        subtitle="Chat in real time and share event links from Meetup, Luma and other platforms"
        actions={
          <Button size="sm" variant="primary" onClick={() => setModal(true)}>
            <Plus size={14} /> New group
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <p className="text-[13px] text-ink-3">Loading groups…</p>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<UsersRound size={22} />}
            title="No groups yet"
            body="Start one for a meetup crew, a study circle or your hackathon team."
            action={
              <Button variant="primary" onClick={() => setModal(true)}>
                New group
              </Button>
            }
          />
        ) : (
          <div className="mx-auto max-w-5xl space-y-8">
            {mine.length > 0 && (
              <section>
                <h2 className="eyebrow mb-3">Your groups</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{mine.map(card)}</div>
              </section>
            )}
            <section>
              <h2 className="eyebrow mb-3">{mine.length ? 'Discover' : 'All groups'}</h2>
              {discover.length === 0 ? (
                <p className="text-[13px] text-ink-3">You are in every group. Start another one above.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{discover.map(card)}</div>
              )}
            </section>
            <p className="flex items-center gap-2 text-[12px] text-ink-3">
              <Link2 size={13} /> Share an event from any platform in a group chat with the link button in the composer.
            </p>
          </div>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New group"
        description="You will be its first member. The group gets its own chat."
        footer={
          <>
            <Button onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="group-form" loading={saving} disabled={form.name.trim().length < 3}>
              Create group
            </Button>
          </>
        }
      >
        <form id="group-form" onSubmit={create} className="space-y-3">
          <div>
            <label className="label" htmlFor="gr-name">
              Name
            </label>
            <input
              id="gr-name"
              className="field"
              maxLength={40}
              placeholder="Rust meetup crew"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="gr-desc">
              What is it for? <span className="font-normal text-ink-3">· optional</span>
            </label>
            <textarea
              id="gr-desc"
              rows={3}
              className="field resize-none"
              maxLength={200}
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
