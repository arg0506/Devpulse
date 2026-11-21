import React, { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { api, setToken } from '../lib/api';
import { DevUser } from '../types';
import { Button, Wordmark, cx, AVATAR_CHOICES, SKILL_CHOICES } from './ui';

interface AuthScreenProps {
  initialMode: 'signin' | 'register';
  onAuthenticated: (user: DevUser) => void;
  onBack: () => void;
}

export default function AuthScreen({ initialMode, onAuthenticated, onBack }: AuthScreenProps) {
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <div className="flex h-14 items-center justify-between px-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-ink-2 hover:text-ink"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <Wordmark />
        <span className="w-16" />
      </div>

      <main className="flex flex-1 items-start justify-center px-5 pt-[8vh] pb-16">
        <div className="animate-fade-up w-full max-w-[400px]">
          <h1 className="font-display text-[28px] leading-tight font-semibold tracking-[-0.025em]">
            {mode === 'signin' ? 'Welcome back' : step === 1 ? 'Create your account' : 'How should people see you?'}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-ink-3">
            {mode === 'signin'
              ? 'Sign in with your email or username.'
              : step === 1
                ? 'It takes about a minute. Step 1 of 2.'
                : 'You can change all of this later. Step 2 of 2.'}
          </p>

          {error && (
            <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-err/30 bg-err/5 px-3 py-2.5 text-[13px] text-err">
              <AlertCircle size={15} className="mt-px flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signin' && (
            <form onSubmit={signIn} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="cred">
                  Email or username
                </label>
                <input
                  id="cred"
                  className="field"
                  autoComplete="username"
                  required
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="pw">
                  Password
                </label>
                <input
                  id="pw"
                  type="password"
                  className="field"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                Sign in
              </Button>
            </form>
          )}

          {mode === 'register' && step === 1 && (
            <form onSubmit={continueToProfile} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="field"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="username">
                  Username
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3">@</span>
                  <input
                    id="username"
                    className="field pl-7 font-mono"
                    autoComplete="username"
                    required
                    maxLength={20}
                    placeholder="ada_l"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="newpw">
                  Password
                </label>
                <input
                  id="newpw"
                  type="password"
                  className="field"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="mt-1.5 text-[12px] text-ink-3">At least 8 characters.</p>
              </div>
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Continue
              </Button>
            </form>
          )}

          {mode === 'register' && step === 2 && (
            <form onSubmit={register} className="mt-6 space-y-5">
              <div>
                <label className="label" htmlFor="role">
                  Role
                </label>
                <input id="role" className="field" required maxLength={40} value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div>
                <span className="label">Avatar</span>
                <div className="grid grid-cols-6 gap-1.5">
                  {AVATAR_CHOICES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      aria-pressed={avatar === a}
                      className={cx(
                        'flex h-11 items-center justify-center rounded-lg border text-[20px] transition-colors',
                        avatar === a ? 'border-ink bg-surface' : 'border-line bg-surface/60 hover:border-line-strong',
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="label">
                  Skills <span className="font-normal text-ink-3">· up to 5</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SKILL_CHOICES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSkill(s)}
                      aria-pressed={skills.includes(s)}
                      className={cx(
                        'h-7 rounded-full border px-2.5 text-[12px] transition-colors',
                        skills.includes(s) ? 'border-ink bg-ink text-inverse' : 'border-line bg-surface text-ink-2 hover:border-line-strong',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="lg" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" variant="primary" size="lg" loading={loading} className="flex-1">
                  Create account
                </Button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-[13px] text-ink-3">
            {mode === 'signin' ? (
              <>
                New to DevPulse?{' '}
                <button type="button" className="font-medium text-ink hover:underline" onClick={() => switchMode('register')}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" className="font-medium text-ink hover:underline" onClick={() => switchMode('signin')}>
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
