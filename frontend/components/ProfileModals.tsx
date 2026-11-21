import React, { useEffect, useState } from 'react';
import { MessageSquare, LogOut, Github } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspace } from '../lib/workspace';
import { DevUser, PresenceStatus } from '../types';
import { isFreeTier } from '../lib/format';
import { Avatar, Badge, Button, Modal, Segmented, cx, AVATAR_CHOICES, SKILL_CHOICES } from './ui';

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen, user, setUser, signOut, openCheckout, theme, toggleTheme } = useWorkspace();
  const [draft, setDraft] = useState<DevUser>(user);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settingsOpen) {
      setDraft(user);
      setError('');
      setSaved(false);
    }
  }, [settingsOpen, user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api<DevUser>('/api/auth/me', {
        method: 'PATCH',
        body: {
          role: draft.role,
          avatarEmoji: draft.avatarEmoji,
          skills: draft.skills,
          status: draft.status,
          customStatus: draft.customStatus || '',
          bio: draft.bio || '',
          gitHubHandle: draft.gitHubHandle || '',
        },
      });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSettingsOpen(false), 400);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (s: string) =>
    setDraft((d) => ({ ...d, skills: d.skills.includes(s) ? d.skills.filter((x) => x !== s) : d.skills.length < 5 ? [...d.skills, s] : d.skills }));

  return (
    <Modal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      title="Profile and settings"
      width={520}
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={signOut}>
            <LogOut size={14} /> Sign out
          </Button>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button variant="primary" type="submit" form="settings-form" loading={saving}>
            {saved ? 'Saved' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id="settings-form" onSubmit={save} className="space-y-5">
        <div className="flex items-center gap-3">
          <Avatar emoji={draft.avatarEmoji} size={48} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">@{user.username}</p>
            <p className="text-[12.5px] text-ink-3">
              {user.xpPoints} XP · {user.streakCount}-day streak
            </p>
          </div>
          <Badge tone={isFreeTier(user.tier) ? 'neutral' : 'accent'}>{isFreeTier(user.tier) ? 'Free' : user.tier}</Badge>
        </div>

        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
          {AVATAR_CHOICES.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={draft.avatarEmoji === a}
              onClick={() => setDraft({ ...draft, avatarEmoji: a })}
              className={cx(
                'flex h-9 items-center justify-center rounded-lg border text-[17px]',
                draft.avatarEmoji === a ? 'border-ink' : 'border-line hover:border-line-strong',
              )}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="st-role">
              Role
            </label>
            <input id="st-role" className="field" maxLength={40} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="st-gh">
              GitHub
            </label>
            <div className="relative">
              <Github size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
              <input
                id="st-gh"
                className="field pl-8"
                maxLength={39}
                placeholder="username"
                value={draft.gitHubHandle || ''}
                onChange={(e) => setDraft({ ...draft, gitHubHandle: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div>
          <span className="label">Status</span>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<PresenceStatus>
              value={draft.status === 'offline' ? 'online' : draft.status}
              onChange={(v) => setDraft({ ...draft, status: v })}
              options={[
                { value: 'online', label: 'Online' },
                { value: 'away', label: 'Away' },
                { value: 'dnd', label: 'Do not disturb' },
              ]}
            />
            <input
              className="field h-8 min-w-0 flex-1 text-[13px]"
              maxLength={80}
              placeholder="What are you working on?"
              value={draft.customStatus || ''}
              onChange={(e) => setDraft({ ...draft, customStatus: e.target.value })}
              aria-label="Custom status"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="st-bio">
            Bio
          </label>
          <textarea
            id="st-bio"
            rows={2}
            className="field resize-none"
            maxLength={280}
            value={draft.bio || ''}
            onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
          />
        </div>

        <div>
          <span className="label">
            Skills <span className="font-normal text-ink-3">· up to 5</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(new Set([...SKILL_CHOICES, ...draft.skills])).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={draft.skills.includes(s)}
                onClick={() => toggleSkill(s)}
                className={cx(
                  'h-7 rounded-full border px-2.5 text-[12px]',
                  draft.skills.includes(s) ? 'border-ink bg-ink text-inverse' : 'border-line text-ink-2 hover:border-line-strong',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-3.5 py-3">
          <div>
            <p className="text-[13px] font-medium">Appearance</p>
            <p className="text-[12px] text-ink-3">Also available from the moon/sun button in the rail.</p>
          </div>
          <Segmented
            value={theme}
            onChange={(v) => v !== theme && toggleTheme()}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </div>

        {isFreeTier(user.tier) && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-3">
            <div>
              <p className="text-[13px] font-medium">You are on the Free plan</p>
              <p className="text-[12px] text-ink-3">Pro adds a badge across the workspace and early access.</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSettingsOpen(false);
                openCheckout('pro');
              }}
            >
              See Pro
            </Button>
          </div>
        )}
        {error && <p className="text-[12.5px] text-err">{error}</p>}
      </form>
    </Modal>
  );
}

export function UserCardModal() {
  const { profileUserId, showProfile, presenceOf, user, openDM, setSettingsOpen } = useWorkspace();
  const p = profileUserId ? presenceOf(profileUserId) : undefined;
  const isMe = profileUserId === user.id;
  const statusText: Record<PresenceStatus, string> = { online: 'Online', away: 'Away', dnd: 'Do not disturb', offline: 'Offline' };

  return (
    <Modal open={!!profileUserId && !!p} onClose={() => showProfile(null)} title={p ? `@${p.username}` : ''} width={360}>
      {p && (
        <div>
          <div className="flex items-center gap-3">
            <Avatar emoji={p.avatarEmoji} size={56} status={p.status} />
            <div className="min-w-0">
              <p className="truncate font-medium">{p.role}</p>
              <p className="text-[12.5px] text-ink-3">
                {statusText[p.status]}
                {p.customStatus ? ` · ${p.customStatus}` : ''}
              </p>
              <div className="mt-1 flex gap-1">
                {!isFreeTier(p.tier) && <Badge tone="accent">{p.tier}</Badge>}
                {typeof p.xpPoints === 'number' && p.xpPoints > 0 && <Badge>{p.xpPoints} XP</Badge>}
              </div>
            </div>
          </div>
          {!!p.skills?.length && (
            <div className="mt-4 flex flex-wrap gap-1">
              {p.skills.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          )}
          <div className="mt-5">
            {isMe ? (
              <Button
                className="w-full"
                onClick={() => {
                  showProfile(null);
                  setSettingsOpen(true);
                }}
              >
                Edit profile
              </Button>
            ) : (
              <Button variant="primary" className="w-full" onClick={() => openDM(p.userId)}>
                <MessageSquare size={14} /> Message
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
