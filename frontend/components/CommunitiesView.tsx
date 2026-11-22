import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Hash, Users, Copy, RefreshCw, Trash2, Pencil, Check, X, UserMinus, Link2 } from 'lucide-react';
import { api } from '../lib/api';
import { socket } from '../socket';
import { useWorkspace } from '../lib/workspace';
import { CommunityRole, DevCommunity, Permission } from '../types';
import { ALL_PERMISSIONS, PERMISSION_LABELS, communityPermissions, topRole } from '../lib/permissions';
import { Avatar, Button, EmptyState, Modal, ViewHeader, cx } from './ui';

const ROLE_COLOURS = ['#ffd23f', '#ff8fc7', '#7cc4ff', '#3ddc97', '#b49cff', '#ff9f43', '#ff6670', '#a1a7b3'];

type RoleDraft = { id?: string; name: string; color: string; permissions: Permission[] };

export default function CommunitiesView() {
  const { user, presenceOf, openChannel, channels } = useWorkspace();
  const [communities, setCommunities] = useState<DevCommunity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [createError, setCreateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [roleDraft, setRoleDraft] = useState<RoleDraft | null>(null);
  const [roleError, setRoleError] = useState('');
  const [channelName, setChannelName] = useState('');
  const [channelKind, setChannelKind] = useState<'text' | 'voice'>('text');
  const [panelError, setPanelError] = useState('');

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

  const selected = communities.find((c) => c.id === selectedId) || null;
  const held = useMemo(() => (selected ? communityPermissions(selected, user.id) : new Set<Permission>()), [selected, user.id]);
  const can = (p: Permission) => held.has(p);
  const isMember = !!selected && (selected.members.includes(user.id) || selected.ownerId === user.id);
  const roles = selected?.roles ?? [];
  const assignable = roles.filter((r) => r.id !== 'owner' && r.id !== 'member');

  // The invite link is only fetched by people who can manage invites.
  useEffect(() => {
    setInviteCode(null);
    setRoleDraft(null);
    setPanelError('');
    if (!selected || !can('manage_invites')) return;
    api<{ code: string }>(`/api/communities/${selected.id}/invite`)
      .then((r) => setInviteCode(r.code))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, held.size]);

  const toggleJoin = async (id: string) => {
    setBusy(id);
    setPanelError('');
    try {
      const updated = await api<DevCommunity>(`/api/communities/${id}/join`, { method: 'POST' });
      setCommunities((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err: any) {
      setPanelError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const joinByInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    try {
      const joined = await api<DevCommunity>('/api/communities/join-invite', { body: { code: joinCode.trim() } });
      setCommunities((prev) => (prev.some((c) => c.id === joined.id) ? prev.map((c) => (c.id === joined.id ? joined : c)) : [...prev, joined]));
      setSelectedId(joined.id);
      setJoinCode('');
    } catch (err: any) {
      setJoinError(err.message);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setCreateError('');
    try {
      const created = await api<DevCommunity>('/api/communities', { body: form });
      setCommunities((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created]));
      setSelectedId(created.id);
      setCreateOpen(false);
      setForm({ name: '', description: '' });
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const run = async (task: () => Promise<unknown>) => {
    setPanelError('');
    try {
      await task();
    } catch (err: any) {
      setPanelError(err.message);
    }
  };

  const saveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !roleDraft) return;
    setRoleError('');
    const body = { name: roleDraft.name.trim(), color: roleDraft.color, permissions: roleDraft.permissions };
    try {
      if (roleDraft.id) await api(`/api/communities/${selected.id}/roles/${roleDraft.id}`, { method: 'PATCH', body });
      else await api(`/api/communities/${selected.id}/roles`, { body });
      setRoleDraft(null);
    } catch (err: any) {
      setRoleError(err.message);
    }
  };

  const togglePermission = (p: Permission) =>
    setRoleDraft((d) => (d ? { ...d, permissions: d.permissions.includes(p) ? d.permissions.filter((x) => x !== p) : [...d.permissions, p] } : d));

  const toggleMemberRole = (memberId: string, roleId: string) => {
    if (!selected) return;
    const current = selected.memberRoles?.[memberId] ?? [];
    const next = current.includes(roleId) ? current.filter((r) => r !== roleId) : [...current, roleId];
    run(() => api(`/api/communities/${selected.id}/members/${memberId}/roles`, { method: 'PUT', body: { roleIds: next } }));
  };

  const copyInvite = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the code stays on screen */
    }
  };

  const members = useMemo(() => {
    if (!selected) return [];
    const order = roles.map((r) => r.id);
    const rank = (r: CommunityRole | undefined) => (r ? order.indexOf(r.id) : order.length);
    return selected.members
      .map((id) => ({ id, role: topRole(selected, id), presence: presenceOf(id) }))
      .sort((a, b) => rank(a.role) - rank(b.role));
  }, [selected, roles, presenceOf]);

  const channelsOf = (c: DevCommunity) => c.channels.map((id) => channels.find((x) => x.id === id)).filter(Boolean);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-canvas">
      <ViewHeader
        title="Communities"
        subtitle="Servers with channels, roles and permissions"
        actions={
          <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> New community
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Server list */}
        <aside className="flex w-full flex-shrink-0 flex-col gap-3 overflow-y-auto border-b border-line p-3 md:w-72 md:border-r md:border-b-0">
          <form onSubmit={joinByInvite} className="flex gap-2">
            <input className="field flex-1" placeholder="Invite code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} aria-label="Invite code" />
            <Button type="submit" disabled={!joinCode.trim()}>
              Join
            </Button>
          </form>
          {joinError && <p className="text-[12.5px] text-err">{joinError}</p>}
          {loading ? (
            <p className="text-[13px] text-ink-3">Loading communities…</p>
          ) : communities.length === 0 ? (
            <EmptyState icon={<Users size={22} />} title="No communities yet" body="Start one for your team, your stack or your city." />
          ) : (
            <ul className="space-y-1">
              {communities.map((c) => {
                const joined = c.members.includes(user.id) || c.ownerId === user.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                        selectedId === c.id ? 'brand-gradient text-[#0a0b0d]' : 'hover:bg-subtle',
                      )}
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0a0b0d]/20 font-display text-[15px] font-bold">
                        {c.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">{c.name}</span>
                        <span className="block truncate font-mono text-[11px] opacity-70">
                          {c.members.length} {c.members.length === 1 ? 'member' : 'members'}
                          {joined ? ' · joined' : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Detail */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          {!selected ? (
            <EmptyState icon={<Users size={22} />} title="Pick a community" body="Choose one on the left, or join with an invite code." />
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-[30px] leading-tight font-extrabold tracking-[-0.03em]">{selected.name}</h2>
                  <p className="mt-1 text-[13.5px] text-ink-2">{selected.description || 'No description yet.'}</p>
                </div>
                <Button
                  size="sm"
                  variant={isMember ? 'ghost' : 'primary'}
                  loading={busy === selected.id}
                  onClick={() => toggleJoin(selected.id)}
                  disabled={selected.ownerId === user.id}
                >
                  {isMember ? (selected.ownerId === user.id ? 'Owner' : 'Leave') : 'Join'}
                </Button>
              </header>

              {panelError && <p className="rounded-lg border border-err/30 bg-err/10 px-3 py-2 text-[12.5px] text-err">{panelError}</p>}

              {/* Invite */}
              {can('manage_invites') && (
                <section className="rounded-2xl border border-line bg-surface p-4">
                  <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Invite link</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-canvas px-3 py-2 font-mono text-[12.5px]">{inviteCode ?? '…'}</code>
                    <Button size="sm" onClick={copyInvite} disabled={!inviteCode}>
                      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        run(async () => {
                          const r = await api<{ code: string }>(`/api/communities/${selected.id}/invite/regenerate`, { method: 'POST' });
                          setInviteCode(r.code);
                        })
                      }
                    >
                      <RefreshCw size={14} /> Reset
                    </Button>
                  </div>
                  <p className="mt-2 text-[12px] text-ink-3">Resetting the link stops the old one from working.</p>
                </section>
              )}

              {/* Channels */}
              <section>
                <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Channels</p>
                <div className="flex flex-wrap gap-2">
                  {channelsOf(selected).map((c) => (
                    <button
                      key={c!.id}
                      type="button"
                      onClick={() => {
                        if (isMember) openChannel(c!.id);
                      }}
                      disabled={!isMember}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] hover:border-line-strong disabled:opacity-60"
                    >
                      <Hash size={13} /> {c!.name}
                    </button>
                  ))}
                </div>
                {can('manage_channels') && (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(async () => {
                        await api(`/api/communities/${selected.id}/channels`, { body: { name: channelName, kind: channelKind } });
                        setChannelName('');
                      });
                    }}
                  >
                    <select className="field w-28" value={channelKind} onChange={(e) => setChannelKind(e.target.value as 'text' | 'voice')} aria-label="Channel type">
                      <option value="text">Text</option>
                      <option value="voice">Voice</option>
                    </select>
                    <input className="field flex-1" placeholder="new-channel" value={channelName} onChange={(e) => setChannelName(e.target.value)} aria-label="New channel name" />
                    <Button type="submit" disabled={channelName.trim().length < 2}>
                      <Plus size={14} /> Add channel
                    </Button>
                  </form>
                )}
              </section>

              {/* Channel visibility */}
              {can('manage_channels') && channelsOf(selected).length > 0 && (
                <section className="space-y-2">
                  <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Who can see each channel</p>
                  {channelsOf(selected).map((c) => {
                    const visibleTo = c!.roleIds ?? [];
                    const restricted = visibleTo.length > 0;
                    return (
                      <div key={c!.id} className="flex flex-wrap items-center gap-1.5 text-[12px]">
                        <span className="w-32 truncate font-mono text-ink-2">#{c!.name}</span>
                        <button
                          type="button"
                          onClick={() => run(() => api(`/api/communities/${selected.id}/channels/${c!.id}`, { method: 'PATCH', body: { roleIds: [] } }))}
                          className={cx('rounded-full border px-2.5 py-0.5 font-mono text-[11px]', !restricted ? 'border-transparent brand-gradient text-[#0a0b0d]' : 'border-line text-ink-3 hover:text-ink')}
                        >
                          everyone
                        </button>
                        {roles
                          .filter((r) => r.id !== 'owner' && r.id !== 'member')
                          .map((r) => {
                            const on = visibleTo.includes(r.id);
                            return (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                  const next = on ? visibleTo.filter((x) => x !== r.id) : [...visibleTo, r.id];
                                  run(() => api(`/api/communities/${selected.id}/channels/${c!.id}`, { method: 'PATCH', body: { roleIds: next } }));
                                }}
                                className={cx('rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors', on ? 'border-transparent text-[#0a0b0d]' : 'border-line text-ink-3 hover:text-ink')}
                                style={on ? { backgroundColor: r.color } : undefined}
                              >
                                {r.name}
                              </button>
                            );
                          })}
                      </div>
                    );
                  })}
                </section>
              )}

              {/* Roles */}
              {can('manage_roles') && (
                <section className="rounded-2xl border border-line bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Roles</p>
                    {!roleDraft && (
                      <Button size="sm" onClick={() => setRoleDraft({ name: '', color: ROLE_COLOURS[2], permissions: ['send_messages'] })}>
                        <Plus size={14} /> New role
                      </Button>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {roles.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-subtle">
                        <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{r.name}</span>
                        <span className="hidden font-mono text-[11px] text-ink-3 sm:inline">{r.permissions.length} permissions</span>
                        {r.id !== 'owner' && (
                          <button
                            type="button"
                            aria-label={`Edit ${r.name}`}
                            onClick={() => setRoleDraft({ id: r.id, name: r.name, color: r.color, permissions: [...r.permissions] })}
                            className="rounded-md p-1 text-ink-3 hover:text-ink"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {!r.isDefault && (
                          <button
                            type="button"
                            aria-label={`Delete ${r.name}`}
                            onClick={() => confirm(`Delete the ${r.name} role?`) && run(() => api(`/api/communities/${selected.id}/roles/${r.id}`, { method: 'DELETE' }))}
                            className="rounded-md p-1 text-ink-3 hover:text-err"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  {roleDraft && (
                    <form onSubmit={saveRole} className="mt-4 space-y-4 rounded-xl border border-line bg-canvas p-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-0 flex-1">
                          <label className="label" htmlFor="role-name">
                            Role name
                          </label>
                          <input
                            id="role-name"
                            className="field"
                            maxLength={24}
                            value={roleDraft.name}
                            onChange={(e) => setRoleDraft({ ...roleDraft, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <span className="label">Colour</span>
                          <div className="flex gap-1.5">
                            {ROLE_COLOURS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                aria-label={`Colour ${c}`}
                                onClick={() => setRoleDraft({ ...roleDraft, color: c })}
                                className={cx('h-6 w-6 rounded-full border-2', roleDraft.color === c ? 'border-ink' : 'border-transparent')}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="label">Permissions</span>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {ALL_PERMISSIONS.map((p) => {
                            const allowed = can(p) || can('administrator');
                            return (
                              <label key={p} className={cx('flex items-start gap-2.5 rounded-lg border border-line p-2.5', !allowed && 'opacity-50')}>
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={roleDraft.permissions.includes(p)}
                                  disabled={!allowed}
                                  onChange={() => togglePermission(p)}
                                />
                                <span>
                                  <span className="block text-[13px] font-medium">{PERMISSION_LABELS[p].label}</span>
                                  <span className="block text-[11.5px] text-ink-3">{PERMISSION_LABELS[p].hint}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      {roleError && <p className="text-[12.5px] text-err">{roleError}</p>}
                      <div className="flex justify-end gap-2">
                        <Button type="button" onClick={() => setRoleDraft(null)}>
                          <X size={14} /> Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={roleDraft.name.trim().length < 2}>
                          <Check size={14} /> {roleDraft.id ? 'Save role' : 'Create role'}
                        </Button>
                      </div>
                    </form>
                  )}
                </section>
              )}

              {/* Members grouped by role */}
              <section>
                <p className="mb-3 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Members · {selected.members.length}</p>
                <div className="space-y-5">
                  {roles
                    .map((role) => ({ role, list: members.filter((m) => (m.role?.id ?? 'member') === role.id) }))
                    .filter((g) => g.list.length > 0)
                    .map(({ role, list }) => (
                      <div key={role.id}>
                        <p className="mb-2 text-[12px] font-semibold" style={{ color: role.color }}>
                          {role.name} — {list.length}
                        </p>
                        <ul className="space-y-1">
                          {list.map((m) => {
                            const isSelf = m.id === user.id;
                            const isOwner = m.id === selected.ownerId;
                            const name = m.presence?.username ?? (isSelf ? user.username : 'member');
                            return (
                              <li key={m.id} className="rounded-xl px-3 py-2 hover:bg-subtle">
                                <div className="flex items-center gap-3">
                                  <Avatar emoji={m.presence?.avatarEmoji ?? (isSelf ? user.avatarEmoji : '👤')} size={30} status={m.presence?.status} />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13.5px] font-medium" style={{ color: role.id === 'member' ? undefined : role.color }}>
                                      {name}
                                      {isSelf && <span className="ml-1.5 font-mono text-[11px] text-ink-3">you</span>}
                                    </p>
                                  </div>
                                  {can('ban_members') && !isSelf && !isOwner && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const reason = window.prompt(`Ban ${name}? Give a reason (optional):`, '');
                                        if (reason !== null) run(() => api(`/api/communities/${selected.id}/bans`, { body: { userId: m.id, reason } }));
                                      }}
                                      className="rounded-md px-2 py-0.5 font-mono text-[11px] text-ink-3 hover:text-err"
                                    >
                                      ban
                                    </button>
                                  )}
                                  {can('kick_members') && !isSelf && !isOwner && (
                                    <button
                                      type="button"
                                      aria-label={`Remove ${name}`}
                                      onClick={() => confirm(`Remove ${name} from ${selected.name}?`) && run(() => api(`/api/communities/${selected.id}/members/${m.id}`, { method: 'DELETE' }))}
                                      className="rounded-md p-1 text-ink-3 hover:text-err"
                                    >
                                      <UserMinus size={14} />
                                    </button>
                                  )}
                                </div>
                                {can('manage_roles') && !isOwner && assignable.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
                                    {assignable.map((r) => {
                                      const has = (selected.memberRoles?.[m.id] ?? []).includes(r.id);
                                      const allowed = r.permissions.every((p) => can(p) || can('administrator'));
                                      return (
                                        <button
                                          key={r.id}
                                          type="button"
                                          disabled={!allowed}
                                          onClick={() => toggleMemberRole(m.id, r.id)}
                                          className={cx(
                                            'rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors disabled:opacity-40',
                                            has ? 'border-transparent text-[#0a0b0d]' : 'border-line text-ink-3 hover:text-ink',
                                          )}
                                          style={has ? { backgroundColor: r.color } : undefined}
                                          title={allowed ? undefined : 'You do not hold every permission this role grants'}
                                        >
                                          {has ? '✓ ' : '+ '}
                                          {r.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                </div>
              </section>

              {can('ban_members') && Object.keys(selected.bans ?? {}).length > 0 && (
                <section>
                  <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">Banned</p>
                  <ul className="space-y-1">
                    {Object.entries(selected.bans ?? {}).map(([id, reason]) => (
                      <li key={id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-subtle">
                        <span className="min-w-0 flex-1 truncate text-[13px]">
                          {presenceOf(id)?.username ?? id}
                          <span className="ml-2 text-[12px] text-ink-3">{reason}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => run(() => api(`/api/communities/${selected.id}/bans/${id}`, { method: 'DELETE' }))}
                          className="rounded-md border border-line px-2.5 py-1 text-[12px] hover:bg-subtle"
                        >
                          Unban
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
                <Link2 size={12} /> Your permissions here:{' '}
                {held.size === 0 ? 'none (join to take part)' : held.has('administrator') ? 'administrator' : [...held].map((p) => PERMISSION_LABELS[p].label).join(', ')}
              </p>
            </div>
          )}
        </main>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New community"
        description="You will be its owner. A general channel is created for it."
        footer={
          <>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
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
            <input id="cm-name" className="field" maxLength={40} placeholder="Rustaceans Kolkata" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="cm-desc">
              Description
            </label>
            <textarea id="cm-desc" rows={3} className="field resize-none" maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {createError && <p className="text-[12.5px] text-err">{createError}</p>}
        </form>
      </Modal>
    </div>
  );
}
