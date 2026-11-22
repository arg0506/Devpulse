import React, { useEffect, useState } from 'react';
import { ChevronRight, LogOut, Moon, Pencil, Sun } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspace } from '../lib/workspace';
import { DevUser } from '../types';
import { AVATAR_CHOICES, Button, Modal, SKILL_CHOICES, cx } from './ui';

const STATUS_OPTIONS: { value: DevUser['status']; label: string; dot: string }[] = [
  { value: 'online', label: 'Available', dot: 'bg-ok' },
  { value: 'away', label: 'Away', dot: 'bg-warn' },
  { value: 'dnd', label: 'Do not disturb', dot: 'bg-err' },
];

/** A WhatsApp-style profile sheet: a large avatar, an editable About line, then a list of settings rows. */
export function SettingsModal() {
  const { settingsOpen, setSettingsOpen, user, setUser, signOut, theme, toggleTheme } = useWorkspace();
  const [draft, setDraft] = useState<DevUser>(user);
  const [editing, setEditing] = useState<null | 'about' | 'role' | 'github' | 'skills' | 'avatar' | 'status'>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (settingsOpen) {
      setDraft(user);
      setEditing(null);
      setError('');
    }
  }, [settingsOpen, user]);

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
      setSettingsOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (s: string) =>
    setDraft((d) => ({ ...d, skills: d.skills.includes(s) ? d.skills.filter((x) => x !== s) : d.skills.length < 5 ? [...d.skills, s] : d.skills }));

  const Row = ({ label, value, onClick }: { label: string; value: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-subtle">
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] text-ink-3">{label}</span>
        <span className="block truncate text-[14px] text-ink">{value}</span>
      </span>
      <ChevronRight size={16} className="text-ink-3" />
    </button>
  );

  const status = STATUS_OPTIONS.find((s) => s.value === draft.status) ?? STATUS_OPTIONS[0];

  return (
    <Modal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      title="Profile"
      width={460}
      footer={
        <>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={() => save()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Hero: avatar, name and About, centred like WhatsApp */}
        <div className="flex flex-col items-center text-center">
          <button
            type="button"
            onClick={() => setEditing(editing === 'avatar' ? null : 'avatar')}
            className="relative flex h-28 w-28 items-center justify-center rounded-full bg-subtle text-[56px] ring-4 ring-surface transition-transform hover:scale-[1.03]"
            aria-label="Change avatar"
          >
            <span aria-hidden="true">{draft.avatarEmoji}</span>
            <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-inverse">
              <Pencil size={14} />
            </span>
          </button>
          <p className="mt-4 font-display text-[22px] font-bold tracking-[-0.02em]">@{user.username}</p>

          {editing === 'about' ? (
            <form
              className="mt-2 flex w-full max-w-xs gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setEditing(null);
              }}
            >
              <input
                autoFocus
                className="field flex-1 text-center"
                maxLength={139}
                value={draft.customStatus || ''}
                onChange={(e) => setDraft({ ...draft, customStatus: e.target.value })}
                aria-label="About"
              />
            </form>
          ) : (
            <button type="button" onClick={() => setEditing('about')} className="mt-2 flex items-center gap-1.5 text-[13.5px] text-ink-2 hover:text-ink">
              {draft.customStatus || 'Add an about line'}
              <Pencil size={12} className="text-ink-3" />
            </button>
          )}
        </div>

        {editing === 'avatar' && (
          <div className="grid grid-cols-6 gap-2 rounded-2xl bg-subtle p-3">
            {AVATAR_CHOICES.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={draft.avatarEmoji === a}
                onClick={() => {
                  setDraft({ ...draft, avatarEmoji: a });
                  setEditing(null);
                }}
                className={cx('flex h-11 items-center justify-center rounded-xl text-[20px] transition-colors', draft.avatarEmoji === a ? 'bg-surface ring-2 ring-ink' : 'hover:bg-surface')}
              >
                {a}
              </button>
            ))}
          </div>
        )}

        {/* Settings rows */}
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {editing === 'role' ? (
            <div className="p-4">
              <label className="label" htmlFor="pf-role">
                Role
              </label>
              <input id="pf-role" className="field" maxLength={40} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} onBlur={() => setEditing(null)} autoFocus />
            </div>
          ) : (
            <Row label="Role" value={draft.role || 'Developer'} onClick={() => setEditing('role')} />
          )}

          {editing === 'github' ? (
            <div className="p-4">
              <label className="label" htmlFor="pf-gh">
                GitHub
              </label>
              <input id="pf-gh" className="field" maxLength={39} value={draft.gitHubHandle || ''} onChange={(e) => setDraft({ ...draft, gitHubHandle: e.target.value })} onBlur={() => setEditing(null)} autoFocus />
            </div>
          ) : (
            <Row label="GitHub" value={draft.gitHubHandle ? `@${draft.gitHubHandle}` : 'Not added'} onClick={() => setEditing('github')} />
          )}

          {editing === 'skills' ? (
            <div className="p-4">
              <span className="label">Skills · up to 5</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SKILL_CHOICES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={draft.skills.includes(s)}
                    onClick={() => toggleSkill(s)}
                    className={cx('h-7 rounded-full border px-2.5 font-mono text-[12px]', draft.skills.includes(s) ? 'border-ink bg-ink text-inverse' : 'border-line text-ink-2')}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setEditing(null)} className="mt-3 text-[12.5px] font-semibold text-ink">
                Done
              </button>
            </div>
          ) : (
            <Row label="Skills" value={draft.skills.length ? draft.skills.join(' · ') : 'Add skills'} onClick={() => setEditing('skills')} />
          )}

          {editing === 'status' ? (
            <div className="space-y-1 p-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setDraft({ ...draft, status: s.value });
                    setEditing(null);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-subtle"
                >
                  <span className={cx('h-2.5 w-2.5 rounded-full', s.dot)} />
                  <span className="text-[14px]">{s.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <Row
              label="Status"
              value={
                <span className="inline-flex items-center gap-2">
                  <span className={cx('h-2 w-2 rounded-full', status.dot)} />
                  {status.label}
                </span>
              }
              onClick={() => setEditing('status')}
            />
          )}

          <button type="button" onClick={toggleTheme} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-subtle">
            <span className="flex-1 text-[14px]">{theme === 'dark' ? 'Dark theme' : 'Light theme'}</span>
            {theme === 'dark' ? <Moon size={16} className="text-ink-3" /> : <Sun size={16} className="text-ink-3" />}
          </button>
        </div>

        <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-[12.5px] text-ink-3">
          {user.xpPoints} XP · {user.streakCount}-day streak · {user.tier} plan
        </div>

        {error && <p className="text-[12.5px] text-err">{error}</p>}

        <button type="button" onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3 text-[14px] font-semibold text-err hover:bg-subtle">
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </Modal>
  );
}
