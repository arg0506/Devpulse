import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, LogOut, Camera, Trash2, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspace } from '../lib/workspace';
import { DevUser, LinkKey, PresenceStatus } from '../types';
import { isFreeTier } from '../lib/format';
import { LINK_FIELDS, avatarSrc, readAvatarFile } from '../lib/profile';
import { Avatar, Badge, Button, Modal, Segmented, cx, AVATAR_CHOICES, SKILL_CHOICES } from './ui';

const LINK_NAMES: Record<LinkKey, string> = Object.fromEntries(LINK_FIELDS.map((f) => [f.key, f.label])) as Record<LinkKey, string>;

/** Profile as anyone signed in can see it: no billing details, the photo as a flag. */
type PublicProfile = DevUser & { hasAvatar?: boolean };

/** Profile photo as a stored data URL, `null` to remove it, or `undefined` to leave it unchanged. */
type PhotoDraft = string | null | undefined;

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen, user, setUser, signOut, openCheckout, theme, toggleTheme } = useWorkspace();
  const [draft, setDraft] = useState<DevUser>(user);
  const [photo, setPhoto] = useState<PhotoDraft>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settingsOpen) {
      setDraft(user);
      setPhoto(undefined);
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
          displayName: draft.displayName || '',
          role: draft.role,
          avatarEmoji: draft.avatarEmoji,
          skills: draft.skills,
          status: draft.status,
          customStatus: draft.customStatus || '',
          bio: draft.bio || '',
          location: draft.location || '',
          links: draft.links || {},
          ...(photo !== undefined ? { avatarImage: photo } : {}),
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

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPhoto(await readAvatarFile(file));
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleSkill = (s: string) =>
    setDraft((d) => ({ ...d, skills: d.skills.includes(s) ? d.skills.filter((x) => x !== s) : d.skills.length < 5 ? [...d.skills, s] : d.skills }));

  const setLink = (key: LinkKey, value: string) => setDraft((d) => ({ ...d, links: { ...(d.links || {}), [key]: value } }));

  const shownPhoto = photo !== undefined ? photo || undefined : avatarSrc(user.id, !!user.avatarImage, user.avatarVersion);

  return (
    <Modal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      title="Profile and settings"
      width={560}
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
        {/* Photo and identity */}
        <div className="flex items-center gap-4">
          <Avatar emoji={draft.avatarEmoji} size={64} src={shownPhoto} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{draft.displayName || `@${user.username}`}</p>
            <p className="text-[12.5px] text-ink-3">
              @{user.username} · {user.xpPoints} XP · {user.streakCount}-day streak
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Camera size={13} /> {shownPhoto ? 'Change photo' : 'Add photo'}
              </Button>
              {shownPhoto && (
                <Button size="sm" variant="ghost" onClick={() => setPhoto(null)}>
                  <Trash2 size={13} /> Remove
                </Button>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </div>
          </div>
          <Badge tone={isFreeTier(user.tier) ? 'neutral' : 'accent'}>{isFreeTier(user.tier) ? 'Free' : user.tier}</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="st-name">
              Display name
            </label>
            <input
              id="st-name"
              className="field"
              maxLength={40}
              placeholder={`@${user.username}`}
              value={draft.displayName || ''}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="st-role">
              Role
            </label>
            <input id="st-role" className="field" maxLength={40} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="st-loc">
              Location
            </label>
            <input
              id="st-loc"
              className="field"
              maxLength={60}
              placeholder="Kolkata, India"
              value={draft.location || ''}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
          </div>
          <div>
            <span className="label">Avatar (if no photo)</span>
            <div className="grid grid-cols-6 gap-1">
              {AVATAR_CHOICES.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={draft.avatarEmoji === a}
                  onClick={() => setDraft({ ...draft, avatarEmoji: a })}
                  className={cx('flex h-8 items-center justify-center rounded-md border text-[15px]', draft.avatarEmoji === a ? 'border-ink' : 'border-line')}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="st-bio">
            Bio
          </label>
          <textarea
            id="st-bio"
            rows={3}
            className="field resize-none"
            maxLength={280}
            placeholder="What you build, what you are learning, what you are looking for."
            value={draft.bio || ''}
            onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
          />
        </div>

        <div>
          <span className="label">Links</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {LINK_FIELDS.map((f) => (
              <div key={f.key} className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[11.5px] font-medium text-ink-3">{f.label}</span>
                <input
                  aria-label={f.label}
                  className="field h-9 pl-24 text-[13px]"
                  placeholder={f.placeholder}
                  maxLength={200}
                  value={draft.links?.[f.key] || ''}
                  onChange={(e) => setLink(f.key, e.target.value)}
                />
              </div>
            ))}
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

/** The public profile: the identity a developer shares. Loaded when opened so it is always current. */
export function UserCardModal() {
  const { profileUserId, showProfile, presenceOf, user, openDM, setSettingsOpen } = useWorkspace();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const p = profileUserId ? presenceOf(profileUserId) : undefined;
  const isMe = profileUserId === user.id;
  const statusText: Record<PresenceStatus, string> = { online: 'Online', away: 'Away', dnd: 'Do not disturb', offline: 'Offline' };

  useEffect(() => {
    setProfile(null);
    if (!profileUserId) return;
    let cancelled = false;
    api<PublicProfile>(`/api/users/${profileUserId}`)
      .then((res) => !cancelled && setProfile(res))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [profileUserId]);

  // Full profile once loaded; until then the presence entry shows the basics.
  const shown: (Partial<PublicProfile> & Pick<DevUser, 'id' | 'username' | 'role' | 'avatarEmoji'>) | null =
    profile ||
    (p ? { id: p.userId, username: p.username, displayName: p.displayName, role: p.role, avatarEmoji: p.avatarEmoji, skills: p.skills, tier: p.tier, xpPoints: p.xpPoints } : null);
  const photo = avatarSrc(profileUserId || '', profile ? profile.hasAvatar : p?.hasAvatar, profile ? profile.avatarVersion : p?.avatarVersion);
  const links = Object.entries(profile?.links || {}) as [LinkKey, string][];
  if (profile?.gitHubHandle && !profile.links?.github) links.unshift(['github', `https://github.com/${profile.gitHubHandle}`]);

  return (
    <Modal
      open={!!profileUserId && !!shown}
      onClose={() => showProfile(null)}
      title={shown ? (shown.displayName || `@${shown.username}`) : ''}
      width={420}
    >
      {shown && (
        <div>
          <div className="flex items-start gap-4">
            <Avatar emoji={shown.avatarEmoji} size={68} status={p?.status} src={photo} />
            <div className="min-w-0 flex-1">
              {shown.displayName && <p className="truncate font-semibold">{shown.displayName}</p>}
              <p className="truncate text-[12.5px] text-ink-3">
                @{shown.username} · {shown.role}
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-3">
                {p ? statusText[p.status] : ''}
                {p?.customStatus ? ` · ${p.customStatus}` : ''}
              </p>
              {shown.location && <p className="mt-0.5 text-[12.5px] text-ink-3">{shown.location}</p>}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {!isFreeTier(shown.tier) && <Badge tone="accent">{shown.tier}</Badge>}
                {typeof shown.xpPoints === 'number' && shown.xpPoints > 0 && <Badge>{shown.xpPoints} XP</Badge>}
                {typeof shown.streakCount === 'number' && shown.streakCount > 1 && <Badge>{shown.streakCount}-day streak</Badge>}
              </div>
            </div>
          </div>

          {shown.bio && <p className="mt-4 text-[13.5px] leading-relaxed text-ink-2">{shown.bio}</p>}

          {links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {links.map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-line px-2.5 text-[12px] text-ink-2 hover:border-line-strong hover:text-ink"
                >
                  {LINK_NAMES[key]} <ExternalLink size={11} />
                </a>
              ))}
            </div>
          )}

          {!!shown.skills?.length && (
            <div className="mt-4 flex flex-wrap gap-1">
              {shown.skills.map((s) => (
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
              <Button variant="primary" className="w-full" onClick={() => openDM(shown.id)}>
                <MessageSquare size={14} /> Message
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
