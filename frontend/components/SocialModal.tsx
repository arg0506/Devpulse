import React, { useEffect, useState } from 'react';
import { socket } from '../socket';
import { useWorkspace } from '../lib/workspace';
import { DevUser } from '../types';
import { timeShort } from '../lib/format';
import { Avatar, Button, Modal, cx } from './ui';

export interface AuditItem {
  id: string;
  at: string;
  actor: string;
  action: string;
  target?: string;
  detail?: string;
}

export interface SocialState {
  friends: DevUser[];
  incoming: { id: string; from: DevUser }[];
  outgoing: { id: string; to: DevUser }[];
  blocked: DevUser[];
  isAdmin: boolean;
  members?: (DevUser & { timeoutUntil: string | null; banReason: string | null })[];
  auditLog?: AuditItem[];
}

const EMPTY: SocialState = { friends: [], incoming: [], outgoing: [], blocked: [], isAdmin: false };

/** Live friends, requests, blocks and moderation data for the signed-in user. */
export function useSocial(): SocialState {
  const [state, setState] = useState<SocialState>(EMPTY);
  useEffect(() => {
    const onData = (data: SocialState) => setState(data);
    socket.on('social:data', onData);
    socket.emit('social:get');
    return () => {
      socket.off('social:data', onData);
    };
  }, []);
  return state;
}

type Tab = 'friends' | 'requests' | 'blocked' | 'moderation';

function PersonRow({ person, children }: { person: DevUser; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-subtle">
      <Avatar emoji={person.avatarEmoji} size={32} status={person.status} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium">{person.username}</p>
        <p className="truncate text-[12px] text-ink-3">{person.role}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">{children}</div>
    </li>
  );
}

function SmallButton({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-lg border border-line px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-subtle',
        danger && 'text-err hover:border-err/40',
      )}
    >
      {children}
    </button>
  );
}

export function SocialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useWorkspace();
  const social = useSocial();
  const [tab, setTab] = useState<Tab>('friends');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [banDraft, setBanDraft] = useState<{ id: string; reason: string } | null>(null);

  const addFriend = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    socket.emit('friend:request', { username: name.trim() }, (res: { error?: string }) => {
      if (res?.error) setError(res.error);
      else setName('');
    });
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'friends', label: 'Friends', count: social.friends.length },
    { id: 'requests', label: 'Requests', count: social.incoming.length },
    { id: 'blocked', label: 'Blocked', count: social.blocked.length },
    ...(social.isAdmin ? [{ id: 'moderation' as Tab, label: 'Moderation' }] : []),
  ];

  const members = (social.members || []).filter((m) => m.id !== user.id);

  return (
    <Modal open={open} onClose={onClose} title="Friends and moderation" description="Friends, requests, blocks and moderation tools.">
      <div className="mb-4 flex gap-1 rounded-full bg-subtle p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cx(
              'flex-1 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors',
              tab === t.id ? 'brand-gradient text-[#0a0b0d]' : 'text-ink-2 hover:text-ink',
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="ml-1.5 font-mono text-[11px] opacity-70">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'friends' && (
        <div className="space-y-4">
          <form onSubmit={addFriend} className="flex gap-2">
            <input
              className="field flex-1"
              placeholder="Add a friend by username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              aria-label="Username to add"
            />
            <Button type="submit" variant="primary" disabled={!name.trim()}>
              Send request
            </Button>
          </form>
          {error && <p className="text-[12.5px] text-err">{error}</p>}
          {social.friends.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-3">No friends yet. Send a request by username.</p>
          ) : (
            <ul className="space-y-1">
              {social.friends.map((f) => (
                <PersonRow key={f.id} person={f}>
                  <SmallButton onClick={() => socket.emit('friend:remove', { userId: f.id })}>Remove</SmallButton>
                  <SmallButton danger onClick={() => socket.emit('user:block', { userId: f.id, blocked: true })}>
                    Block
                  </SmallButton>
                </PersonRow>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-5">
          <div>
            <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Incoming</p>
            {social.incoming.length === 0 ? (
              <p className="text-[13px] text-ink-3">No incoming requests.</p>
            ) : (
              <ul className="space-y-1">
                {social.incoming.map((r) => (
                  <PersonRow key={r.id} person={r.from}>
                    <SmallButton onClick={() => socket.emit('friend:respond', { requestId: r.id, accept: true })}>Accept</SmallButton>
                    <SmallButton onClick={() => socket.emit('friend:respond', { requestId: r.id, accept: false })}>Decline</SmallButton>
                  </PersonRow>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Sent</p>
            {social.outgoing.length === 0 ? (
              <p className="text-[13px] text-ink-3">No pending requests.</p>
            ) : (
              <ul className="space-y-1">
                {social.outgoing.map((r) => (
                  <PersonRow key={r.id} person={r.to}>
                    <span className="font-mono text-[11px] text-ink-3">pending</span>
                  </PersonRow>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'blocked' && (
        <div>
          {social.blocked.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-3">You have not blocked anyone.</p>
          ) : (
            <ul className="space-y-1">
              {social.blocked.map((b) => (
                <PersonRow key={b.id} person={b}>
                  <SmallButton onClick={() => socket.emit('user:block', { userId: b.id, blocked: false })}>Unblock</SmallButton>
                </PersonRow>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[12px] text-ink-3">Messages from people you block are hidden in your chat.</p>
        </div>
      )}

      {tab === 'moderation' && social.isAdmin && (
        <div className="space-y-5">
          <div>
            <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Members</p>
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {members.map((m) => (
                <li key={m.id} className="rounded-xl px-3 py-2.5 hover:bg-subtle">
                  <div className="flex items-center gap-3">
                    <Avatar emoji={m.avatarEmoji} size={30} status={m.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{m.username}</p>
                      <p className="truncate font-mono text-[11px] text-ink-3">
                        {m.banReason
                          ? `banned · ${m.banReason}`
                          : m.timeoutUntil
                            ? `timed out until ${timeShort(m.timeoutUntil)}`
                            : 'in good standing'}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {m.banReason ? (
                        <SmallButton onClick={() => socket.emit('mod:unban', { userId: m.id })}>Unban</SmallButton>
                      ) : (
                        <>
                          {m.timeoutUntil ? (
                            <SmallButton onClick={() => socket.emit('mod:untimeout', { userId: m.id })}>Lift timeout</SmallButton>
                          ) : (
                            <SmallButton onClick={() => socket.emit('mod:timeout', { userId: m.id, minutes: 10 })}>Timeout 10m</SmallButton>
                          )}
                          <SmallButton danger onClick={() => setBanDraft({ id: m.id, reason: '' })}>
                            Ban
                          </SmallButton>
                        </>
                      )}
                    </div>
                  </div>
                  {banDraft?.id === m.id && (
                    <form
                      className="mt-2 flex gap-2 pl-10"
                      onSubmit={(e) => {
                        e.preventDefault();
                        socket.emit('mod:ban', { userId: m.id, reason: banDraft.reason });
                        setBanDraft(null);
                      }}
                    >
                      <input
                        className="field flex-1"
                        placeholder="Reason for the ban"
                        value={banDraft.reason}
                        maxLength={140}
                        onChange={(e) => setBanDraft({ id: m.id, reason: e.target.value })}
                        aria-label="Reason for the ban"
                      />
                      <Button type="submit" variant="primary">
                        Confirm ban
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Audit log</p>
            {(social.auditLog || []).length === 0 ? (
              <p className="text-[13px] text-ink-3">Nothing yet.</p>
            ) : (
              <ul className="max-h-56 space-y-2 overflow-y-auto font-mono text-[12px]">
                {(social.auditLog || []).map((a) => (
                  <li key={a.id} className="rounded-lg border border-line px-3 py-2">
                    <span className="text-ink-3">{timeShort(a.at)}</span> <span className="font-semibold">{a.actor}</span> {a.action}
                    {a.target && <span className="text-ink-2"> → {a.target}</span>}
                    {a.detail && <span className="text-ink-3"> · {a.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
