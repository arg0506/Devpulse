import React, { useState } from 'react';
import { Copy, LogOut, RefreshCw, UserMinus, UserPlus } from 'lucide-react';
import { socket } from '../socket';
import { useWorkspace } from '../lib/workspace';
import { DevChannel } from '../types';
import { Avatar, Button, Modal, cx } from './ui';

/** Lets someone start a new group with people who are online, as WhatsApp does. */
export function CreateGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, presences, openChannel } = useWorkspace();
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const people = presences.filter((p) => p.userId !== user.id && !['system-bot', 'gemini-bot'].includes(p.userId));
  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    socket.emit('group:create', { name: name.trim(), memberIds: picked }, (res: { channel?: DevChannel; error?: string }) => {
      setSaving(false);
      if (res?.error || !res?.channel) return setError(res?.error || 'Could not create the group.');
      setName('');
      setPicked([]);
      openChannel(res.channel.id);
      onClose();
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New group"
      description="Give it a name and choose who to add. You become its admin."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="group-form" loading={saving} disabled={!name.trim()}>
            Create group
          </Button>
        </>
      }
    >
      <form id="group-form" onSubmit={create} className="space-y-4">
        <div>
          <label className="label" htmlFor="group-name">
            Group name
          </label>
          <input id="group-name" className="field" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekend plans" />
        </div>
        <div>
          <span className="label">Add people · {picked.length} selected</span>
          {people.length === 0 ? (
            <p className="text-[13px] text-ink-3">No one else is online right now.</p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {people.map((p) => (
                <li key={p.userId}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-subtle">
                    <input type="checkbox" checked={picked.includes(p.userId)} onChange={() => toggle(p.userId)} />
                    <Avatar emoji={p.avatarEmoji} size={30} status={p.status} />
                    <span className="text-[13.5px]">{p.username}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <p className="text-[12.5px] text-err">{error}</p>}
      </form>
    </Modal>
  );
}

/** Group details: name, description, who can post, members, invite link and leaving. */
export function GroupInfoModal({ open, onClose, channel }: { open: boolean; onClose: () => void; channel: DevChannel }) {
  const { user, presences, presenceOf, openChannel } = useWorkspace();
  const isAdmin = (channel.admins || []).includes(user.id);
  const members = channel.members || [];
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description || '');
  const [adding, setAdding] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const run = (event: string, payload: Record<string, unknown>) => {
    setError('');
    socket.emit(event, payload, (res: { error?: string }) => {
      if (res?.error) setError(res.error);
    });
  };

  const addable = presences.filter((p) => !members.includes(p.userId) && !['system-bot', 'gemini-bot'].includes(p.userId));

  return (
    <Modal open={open} onClose={onClose} title={`${channel.icon || '👥'} ${channel.name}`} description={`${members.length} members`}>
      <div className="space-y-6">
        {isAdmin && (
          <section className="space-y-3">
            <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Group details</p>
            <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Group name" />
            <textarea className="field resize-none" rows={2} maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Description" />
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={!!channel.adminOnly} onChange={(e) => run('group:update', { channelId: channel.id, adminOnly: e.target.checked })} />
                Only admins can send messages
              </label>
              <Button size="sm" onClick={() => run('group:update', { channelId: channel.id, name, description })}>
                Save details
              </Button>
            </div>
          </section>
        )}

        {!isAdmin && channel.description && <p className="text-[13.5px] text-ink-2">{channel.description}</p>}

        <section>
          <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Members</p>
          <ul className="space-y-1">
            {members.map((id) => {
              const p = presenceOf(id);
              const admin = (channel.admins || []).includes(id);
              const self = id === user.id;
              return (
                <li key={id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-subtle">
                  <Avatar emoji={p?.avatarEmoji || '🙂'} size={30} status={p?.status} />
                  <span className="min-w-0 flex-1 truncate text-[13.5px]">
                    {p?.username || id}
                    {self && <span className="ml-1.5 text-[11px] text-ink-3">you</span>}
                  </span>
                  {admin && <span className="rounded bg-[#eef2ff] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#2f5bff]">admin</span>}
                  {isAdmin && !self && (
                    <button
                      type="button"
                      aria-label={`Remove ${p?.username || id}`}
                      onClick={() => run('group:members', { channelId: channel.id, remove: [id] })}
                      className="rounded-md p-1 text-ink-3 hover:text-err"
                    >
                      <UserMinus size={15} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {isAdmin && addable.length > 0 && (
          <section className="space-y-2">
            <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Add people</p>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {addable.map((p) => (
                <li key={p.userId}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-subtle">
                    <input
                      type="checkbox"
                      checked={adding.includes(p.userId)}
                      onChange={() => setAdding((prev) => (prev.includes(p.userId) ? prev.filter((x) => x !== p.userId) : [...prev, p.userId]))}
                    />
                    <span className="text-[13.5px]">{p.username}</span>
                  </label>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              disabled={adding.length === 0}
              onClick={() => {
                run('group:members', { channelId: channel.id, add: adding });
                setAdding([]);
              }}
            >
              <UserPlus size={14} /> Add {adding.length || ''} {adding.length === 1 ? 'person' : 'people'}
            </Button>
          </section>
        )}

        {isAdmin && channel.inviteCode && (
          <section className="space-y-2">
            <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Invite link</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-canvas px-3 py-2 font-mono text-[12px]">{channel.inviteCode}</code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(channel.inviteCode!).catch(() => undefined);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-lg border border-line px-3 py-2 text-[12px] hover:bg-subtle"
              >
                <Copy size={13} className="inline" /> {copied ? 'Copied' : 'Copy'}
              </button>
              <button type="button" onClick={() => run('group:regenerate-invite', { channelId: channel.id })} className="rounded-lg border border-line px-3 py-2 text-[12px] hover:bg-subtle">
                <RefreshCw size={13} className="inline" /> Reset
              </button>
            </div>
          </section>
        )}

        {error && <p className="text-[12.5px] text-err">{error}</p>}

        <div className={cx('border-t border-line pt-4')}>
          <button
            type="button"
            onClick={() => {
              socket.emit('group:leave', { channelId: channel.id }, () => undefined);
              onClose();
              openChannel('general');
            }}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-err hover:underline"
          >
            <LogOut size={14} /> Leave group
          </button>
        </div>
      </div>
    </Modal>
  );
}
