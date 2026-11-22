import React, { useState } from 'react';
import { ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { api, setToken } from '../lib/api';
import { DevUser } from '../types';
import { LemoMark, cx, AVATAR_CHOICES, SKILL_CHOICES } from './ui';

interface AuthScreenProps {
  initialMode: 'signin' | 'register';
  onAuthenticated: (user: DevUser) => void;
  onBack: () => void;
}

const LABEL = 'block text-[13px] font-medium text-[#111318]';
const INPUT =
  'mt-1.5 w-full border-b border-[#111318]/80 bg-transparent py-2 text-[14px] text-[#111318] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#6d2dff]';
const PRIMARY =
  'w-full rounded-xl bg-[#111318] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50';
const SECONDARY =
  'w-full rounded-xl border border-[#111318]/15 bg-[#f3f3f5] py-3 text-[14px] font-semibold text-[#111318] transition-colors hover:bg-[#e9e9ec]';

/** Flat, friendly characters for the left panel. Drawn for Lemo in the reference's style. */
function Characters() {
  return (
    <svg viewBox="0 0 340 280" className="h-auto w-full max-w-[300px]" aria-hidden="true">
      {/* tall purple block */}
      <rect x="60" y="30" width="112" height="230" fill="#6d2dff" />
      <circle cx="98" cy="72" r="6" fill="#ffffff" />
      <circle cx="98" cy="72" r="2.6" fill="#111318" />
      <circle cx="128" cy="72" r="6" fill="#ffffff" />
      <circle cx="128" cy="72" r="2.6" fill="#111318" />
      <rect x="112" y="92" width="4" height="22" fill="#111318" />
      {/* black block */}
      <rect x="150" y="128" width="92" height="132" fill="#111318" />
      <circle cx="176" cy="164" r="7" fill="#ffffff" />
      <circle cx="176" cy="164" r="2.8" fill="#111318" />
      <circle cx="206" cy="164" r="7" fill="#ffffff" />
      <circle cx="206" cy="164" r="2.8" fill="#111318" />
      {/* yellow arch with a long arm */}
      <path d="M236 260 V142 A34 34 0 0 1 304 142 V260 Z" fill="#f5c400" />
      <circle cx="262" cy="176" r="3.5" fill="#111318" />
      <line x1="304" y1="210" x2="338" y2="210" stroke="#111318" strokeWidth="4" strokeLinecap="round" />
      {/* orange dome with a smile */}
      <path d="M40 260 A72 72 0 0 1 184 260 Z" fill="#ff7a2e" />
      <circle cx="90" cy="232" r="4.5" fill="#111318" />
      <circle cx="130" cy="232" r="4.5" fill="#111318" />
      <path d="M96 246 Q110 258 124 246" fill="none" stroke="#111318" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export default function AuthScreen({ initialMode, onAuthenticated, onBack }: AuthScreenProps) {
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [credential, setCredential] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Full-stack engineer');
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0]);
  const [skills, setSkills] = useState<string[]>(['TypeScript', 'React']);

  const switchMode = (next: 'signin' | 'register') => {
    setMode(next);
    setStep(1);
    setError(null);
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: DevUser }>('/api/auth/login', { body: { loginCredential: credential, password } });
      setToken(res.token);
      onAuthenticated(res.user);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const continueToProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanName)) return setError('Usernames use 3–20 lowercase letters, numbers or underscores.');
    if (password.length < 8) return setError('Passwords need at least 8 characters.');
    setUsername(cleanName);
    setStep(2);
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ token: string; user: DevUser }>('/api/auth/register', {
        body: { email, username, password, role, avatarEmoji: avatar, skills },
      });
      setToken(res.token);
      onAuthenticated(res.user);
    } catch (err: any) {
      setError(err.message);
      // Email/username conflicts are fixed on the first step.
      if (/email|username/i.test(err.message)) setStep(1);
      setLoading(false);
    }
  };

  const toggleSkill = (s: string) => setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 5 ? [...prev, s] : prev));

  const heading = mode === 'signin' ? 'Welcome back!' : step === 1 ? 'Create account' : 'How should people see you?';
  const subheading = mode === 'signin' ? 'Please enter your details' : step === 1 ? 'It takes about a minute' : 'You can change all of this later';

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[#1c1d22] p-4 md:p-10">
      <div className="mb-5 flex w-full max-w-[1000px] items-center justify-between">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-[13px] text-white/60 transition-colors hover:text-white">
          <ArrowLeft size={14} /> Back to site
        </button>
      </div>

      <div className="grid w-full max-w-[1000px] overflow-hidden rounded-3xl bg-white shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)] md:grid-cols-2">
        {/* Illustration panel */}
        <div className="hidden items-center justify-center bg-[#e9e9eb] p-10 md:flex">
          <Characters />
        </div>

        {/* Form panel */}
        <div className="animate-fade-up flex flex-col justify-center px-7 py-10 md:px-14">
          <div className="mx-auto">
            <LemoMark size={34} />
          </div>
          <h1 className="mt-6 text-center text-[28px] font-bold tracking-[-0.02em] text-[#111318]">{heading}</h1>
          <p className="mt-1.5 text-center text-[13px] text-[#6b7280]">{subheading}</p>

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-[#d93644]/30 bg-[#d93644]/10 px-3 py-2.5 text-[13px] text-[#b42331]">
              <AlertCircle size={15} className="mt-px flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signin' && (
            <form onSubmit={signIn} className="mt-8 space-y-6">
              <div>
                <label className={LABEL} htmlFor="cred">
                  Email or username
                </label>
                <input id="cred" className={INPUT} autoComplete="username" required value={credential} onChange={(e) => setCredential(e.target.value)} />
              </div>
              <div>
                <label className={LABEL} htmlFor="pw">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="pw"
                    type={showPassword ? 'text' : 'password'}
                    className={cx(INPUT, 'pr-8')}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute top-1/2 right-0 -translate-y-1/2 p-1 text-[#111318]/70 hover:text-[#111318]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <button type="submit" disabled={loading} className={PRIMARY}>
                  {loading ? 'Signing in…' : 'Log In'}
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && step === 1 && (
            <form onSubmit={continueToProfile} className="mt-8 space-y-6">
              <div>
                <label className={LABEL} htmlFor="email">
                  Email
                </label>
                <input id="email" type="email" className={INPUT} autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className={LABEL} htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  className={cx(INPUT, 'font-mono')}
                  autoComplete="username"
                  required
                  maxLength={20}
                  placeholder="ada_l"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="newpw">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="newpw"
                    type={showPassword ? 'text' : 'password'}
                    className={cx(INPUT, 'pr-8')}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute top-1/2 right-0 -translate-y-1/2 p-1 text-[#111318]/70 hover:text-[#111318]"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1.5 text-[12px] text-[#6b7280]">At least 8 characters.</p>
              </div>
              <button type="submit" className={PRIMARY}>
                Continue
              </button>
            </form>
          )}

          {mode === 'register' && step === 2 && (
            <form onSubmit={register} className="mt-8 space-y-6">
              <div>
                <label className={LABEL} htmlFor="role">
                  Role
                </label>
                <input id="role" className={INPUT} required maxLength={40} value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div>
                <span className={LABEL}>Avatar</span>
                <div className="mt-2 grid grid-cols-6 gap-1.5">
                  {AVATAR_CHOICES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      aria-pressed={avatar === a}
                      className={cx(
                        'flex h-10 items-center justify-center rounded-xl border-2 text-[18px] transition-colors',
                        avatar === a ? 'border-[#6d2dff] bg-[#f3efff]' : 'border-[#111318]/10 hover:border-[#111318]/30',
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className={LABEL}>
                  Skills <span className="font-normal text-[#6b7280]">· up to 5</span>
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SKILL_CHOICES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSkill(s)}
                      aria-pressed={skills.includes(s)}
                      className={cx(
                        'h-7 rounded-full border px-2.5 text-[12px] transition-colors',
                        skills.includes(s) ? 'border-[#111318] bg-[#111318] text-white' : 'border-[#111318]/15 text-[#4a505c] hover:border-[#111318]/40',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className={SECONDARY} onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="submit" disabled={loading} className={PRIMARY}>
                  {loading ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-10 text-center text-[12.5px] text-[#6b7280]">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button type="button" className="font-semibold text-[#111318] hover:underline" onClick={() => switchMode('register')}>
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" className="font-semibold text-[#111318] hover:underline" onClick={() => switchMode('signin')}>
                  Log In
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
