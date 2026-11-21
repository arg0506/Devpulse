import React, { useEffect, useState } from 'react';
import { Plus, Hash, Users } from 'lucide-react';
import { api } from '../lib/api';
import { socket } from '../socket';
import { useWorkspace } from '../lib/workspace';
import { DevCommunity } from '../types';
import { Avatar, Button, EmptyState, Modal, ViewHeader } from './ui';

export default function CommunitiesView() {
  const { user, presenceOf, openChannel, channels } = useWorkspace();
  const [communities, setCommunities] = useState<DevCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<DevCommunity[]>('/api/communities')
      .then(setCommunities)
      .catch(() => undefined)
      .finally(() => setLoading(false));
    const upsert = (c: DevCommunity) =>
      setCommunities((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c]));
    socket.on('community:new', upsert);
    socket.on('community:update', upsert);
    return () => {
      socket.off('community:new', upsert);
      socket.off('community:update', upsert);
    };
  }, []);

  const toggle = async (id: string) => {
    setBusy(id);
    try {
      const updated = await api<DevCommunity>(`/api/communities/${id}/join`, { method: 'POST' });
      setCommunities((prev) => prev.map((c) => (c.id === id ? updated : c)));
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
      const created = await api<DevCommunity>('/api/communities', { body: form });
      setCommunities((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created]));
      setModal(false);
      setForm({ name: '', description: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const channelName = (id: string) => channels.find((c) => c.id === id)?.name || id;

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-canvas">
      <ViewHeader
        title="Communities"
        subtitle="Groups of people and channels around a shared interest"
        actions={
          <Button size="sm" variant="primary" onClick={() => setModal(true)}>
            <Plus size={14} /> New community
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <p className="text-[13px] text-ink-3">Loading communities…</p>
        ) : communities.length === 0 ? (
          <EmptyState
            icon={<Users size={22} />}
            title="No communities yet"
            body="Start one for your team, your stack or your city."
            action={
              <Button variant="primary" onClick={() => setModal(true)}>
                New community
              </Button>
            }
          />
        ) : (
          <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {communities.map((c) => {
              const joined = c.members.includes(user.id);
              const people = c.members.map((id) => presenceOf(id)).filter(Boolean);
              return (
                <article key={c.id} className="flex flex-col rounded-xl border border-line bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-[17px] font-semibold tracking-[-0.01em]">{c.name}</h2>
                    {joined && <span className="eyebrow text-ok">Joined</span>}
                  </div>
                  <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-2">{c.description || 'No description yet.'}</p>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {c.channels.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => openChannel(id)}
                        className="inline-flex h-6 items-center gap-1 rounded-md bg-subtle px-2 text-[12px] text-ink-2 hover:text-ink"
                      >
                        <Hash size={11} /> {channelName(id)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {people.slice(0, 4).map((p) => (
                          <span key={p!.userId} className="rounded-[30%] ring-2 ring-surface">
                            <Avatar emoji={p!.avatarEmoji} size={22} />
                          </span>
                        ))}
                      </div>
                      <span className="text-[12px] text-ink-3">
                        {c.members.length} {c.members.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                    <Button size="sm" variant={joined ? 'ghost' : 'secondary'} loading={busy === c.id} onClick={() => toggle(c.id)}>
                      {joined ? 'Leave' : 'Join'}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New community"
        description="You will be its first member. A general channel is created for it."
        footer={
          <>
            <Button onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="community-form" loading={saving} disabled={form.name.trim().length < 3}>
              Create community
            </Button>
          </>
        }
      >
        <form id="community-form" onSubmit={create} className="space-y-3">
          <div>
            <label className="label" htmlFor="cm-name">
              Name
            </label>
            <input
              id="cm-name"
              className="field"
              maxLength={40}
              placeholder="Rustaceans Kolkata"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="cm-desc">
              Description
            </label>
            <textarea
              id="cm-desc"
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
