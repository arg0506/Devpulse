import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, Check, Database, Hash, KeyRound, Link2, PenTool, Plus, Rocket, Server, Shield, Sprout, Users, Webhook, Workflow } from 'lucide-react';
import { Wordmark, cx } from './ui';

interface LandingPageProps {
  onGetStarted: (plan?: 'pro' | 'enterprise') => void;
  onSignIn: () => void;
}

// Palette taken from the monitor design: electric blue, navy stage, black ink and soft white.
const BLUE = '#2f5bff';
const NAVY = '#0a1a4f';
const INK = '#0a0b0d';
const PALE = '#eef2ff';

const HERO_FIGURE = '/hero-figure.jpg';

const NAV_LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'self-host', label: 'Self-host' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/** Fades and lifts its children into view the first time they are on screen. */
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx('reveal', shown && 'is-in', className)} style={{ ['--d' as any]: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** A rounded section heading with a small pill label, as used throughout the design. */
function SectionTitle({ label, title, lead, dark }: { label: string; title: React.ReactNode; lead?: string; dark?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className={cx('inline-block rounded-full px-3 py-1 text-[12px] font-semibold', dark ? 'bg-white/15 text-white' : 'bg-[#eef2ff] text-[#2f5bff]')}>{label}</span>
      <h2 className={cx('mt-5 font-display text-[40px] leading-[1.02] font-extrabold tracking-[-0.035em] md:text-[56px]', dark ? 'text-white' : 'text-[#0a0b0d]')}>{title}</h2>
      {lead && <p className={cx('mx-auto mt-5 max-w-xl text-[16px] leading-relaxed', dark ? 'text-white/75' : 'text-[#0a0b0d]/60')}>{lead}</p>}
    </div>
  );
}

// ---------- Content ----------

const FEATURES = [
  { icon: Users, title: 'Communities with roles', body: 'Servers with owners, custom roles, invite links and private channels for chosen roles.', tone: 'blue' },
  { icon: Hash, title: 'Live channels and threads', body: 'Replies, edits, mentions, reactions and presence that updates the moment it happens.', tone: 'white' },
  { icon: Link2, title: 'Rich messages', body: 'File uploads, GIFs, link previews and slash commands like /roll and /poll.', tone: 'white' },
  { icon: PenTool, title: 'Shared whiteboard', body: 'Sketch architecture together with live strokes, cursors and PNG export.', tone: 'pale' },
  { icon: Workflow, title: 'Agent studio', body: 'Chain triggers, Gemini, web search, JavaScript and webhooks on a visual canvas.', tone: 'white' },
  { icon: Shield, title: 'Moderation you can trust', body: 'Friends and blocking for you. Timeouts, bans and an audit log for admins.', tone: 'pale' },
] as const;

const STEPS = [
  { n: '01', title: 'Create an account', body: 'Sign up with Google or email, pick your role and skills.' },
  { n: '02', title: 'Join a community', body: 'Use an invite code or start your own with channels and roles.' },
  { n: '03', title: 'Work together', body: 'Chat, talk in voice, sketch and run agents, all in one place.' },
];

const SELF_HOST = [
  { icon: Database, title: 'Zero-setup start', body: 'Data lives in a local file until you need more.' },
  { icon: Server, title: 'PostgreSQL when you grow', body: 'Mirror users, messages and communities with Prisma.' },
  { icon: KeyRound, title: 'Your own AI key', body: 'Add GEMINI_API_KEY for @gemini replies and agent steps.' },
  { icon: Webhook, title: 'Actions to any webhook', body: 'Agent actions post into a channel or to any https endpoint.' },
];

const PLANS = [
  { key: undefined, name: 'Free', icon: Sprout, price: '$0', period: 'forever', blurb: 'The whole workspace for you and your team.', points: ['Channels, DMs and threads', 'Whiteboard and agent studio', 'Bring your own Gemini key'], cta: 'Start free', tone: 'white' },
  { key: 'pro' as const, name: 'Pro', icon: Rocket, price: '$15', period: 'per member / month', blurb: 'For teams that live in Lemo every day.', points: ['Everything in Free', 'Pro badge across the workspace', 'Early access to new modules'], cta: 'Choose Pro', tone: 'blue' },
  { key: 'enterprise' as const, name: 'Enterprise', icon: Building2, price: '$99', period: 'per workspace / month', blurb: 'For organisations running their own instance.', points: ['Everything in Pro', 'Self-hosting guidance', 'SSO setup help'], cta: 'Choose Enterprise', tone: 'black' },
] as const;

const FAQS = [
  { q: 'Is there a free plan?', a: 'Yes. The Free plan includes channels, DMs, threads, the whiteboard and the agent studio. Bring your own Gemini key for AI features.' },
  { q: 'Can I hide a channel from some people?', a: 'Yes. In a community you can limit a channel to chosen roles. Everyone else cannot see, join, read or post in it.' },
  { q: 'Do I need a database to run it?', a: 'No. Without DATABASE_URL, Lemo stores data in a local file. Add PostgreSQL with Prisma when you need it.' },
  { q: 'Do workflows run on a schedule?', a: 'Not yet. Workflows run when you press Run. Scheduled and incoming-webhook triggers need a server-side runner, which is next.' },
  { q: 'Is my session safe in the browser?', a: 'Sessions live in an HttpOnly cookie that page scripts cannot read. Signing out ends the session on every device.' },
];

// ---------- Monitor pieces ----------

/** A small pixel-art character drawn from rows of '#' pixels. */
const INVADER_ROWS = ['..#.....#..', '...#...#...', '..#######..', '.##.###.##', '###########', '#.#######.#', '#.#.....#.#', '...##.##...'];

function PixelInvader({ className }: { className?: string }) {
  const cells = INVADER_ROWS.flatMap((row, y) => row.split('').map((c, x) => (c === '#' ? { x, y } : null))).filter(Boolean) as { x: number; y: number }[];
  return (
    <svg viewBox="0 0 11 8" className={className} aria-hidden="true" shapeRendering="crispEdges">
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width="1" height="1" fill="#9bb8ff" />
      ))}
    </svg>
  );
}

/** The workspace, drawn as it would look on the screen. */
function WorkspaceScreen() {
  const channels = ['general', 'react-vite', 'ai-lounge', 'bugs'];
  const messages = [
    { user: 'dan_abramov', color: '#7cc4ff', text: 'Throttle socket updates to 60ms and the jank goes away.' },
    { user: 'alex_g', color: '#3ddc97', text: 'Shipping that to node-api now.' },
    { user: 'gemini', color: '#b49cff', text: 'Tip: debounce typing events separately.', ai: true },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-[#0a0b0d]/10 bg-white text-left shadow-[0_30px_80px_-30px_rgba(10,26,79,0.45)]">
      <div className="flex h-10 items-center gap-2 border-b border-[#0a0b0d]/10 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto font-mono text-[11px] text-[#0a0b0d]/50">Lemo · #react-vite</span>
      </div>
      <div className="grid md:grid-cols-[170px_1fr]">
        <aside className="hidden border-r border-[#0a0b0d]/10 bg-[#f4f5fb] p-3 md:block">
          <p className="mb-2 font-mono text-[10px] text-[#0a0b0d]/50">CHANNELS</p>
          {channels.map((c) => (
            <p key={c} className={cx('rounded-lg px-2 py-1.5 font-mono text-[12px]', c === 'react-vite' ? 'bg-white font-semibold shadow-sm' : 'text-[#0a0b0d]/60')}>
              # {c}
            </p>
          ))}
        </aside>
        <section className="space-y-4 p-5">
          {messages.map((m) => (
            <div key={m.user} className="flex gap-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[12px] font-bold text-[#0a0b0d]" style={{ backgroundColor: m.color }}>
                {m.user[0]}
              </span>
              <div>
                <p className="text-[12.5px] font-semibold">
                  {m.user}
                  {m.ai && <span className="ml-2 rounded bg-[#2f5bff] px-1.5 py-0.5 text-[10px] font-bold text-white">AI</span>}
                </p>
                <p className="text-[13px] text-[#0a0b0d]/70">{m.text}</p>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-[#0a0b0d]/10 px-4 py-2.5 font-mono text-[12px] text-[#0a0b0d]/40">message #react-vite, or try @gemini</div>
        </section>
      </div>
    </div>
  );
}

// ---------- Page ----------

export default function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-full bg-white text-[#0a0b0d]">
      {/* Hero: a monitor on a blue stage, with the site inside the screen */}
      <header className="relative overflow-hidden px-4 pt-10 pb-20 md:pt-16" style={{ backgroundColor: NAVY }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
            backgroundSize: '90px 90px, 37px 37px',
            backgroundPosition: '0 0, 17px 23px',
          }}
        />
        <div className="relative mx-auto max-w-5xl">
          <div className="animate-fade-up overflow-hidden rounded-[28px] bg-white text-[#0a0b0d] shadow-[0_50px_120px_-30px_rgba(47,91,255,0.7)]" style={{ animationDelay: '60ms' }}>
            <div className="text-[#0a0b0d]">
              <nav className="flex h-14 items-center justify-between px-6">
                <Wordmark />
                <div className="hidden items-center gap-7 text-[12px] text-[#0a0b0d]/75 md:flex">
                  {NAV_LINKS.map((link) => (
                    <a key={link.id} href={`#${link.id}`} className="hover:text-[#0a0b0d]">
                      {link.label}
                    </a>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={onSignIn} className="rounded-lg border border-[#0a0b0d]/15 px-4 py-2 text-[12px] font-semibold">
                    Log in
                  </button>
                  <button type="button" onClick={() => onGetStarted()} className="rounded-lg bg-[#0a0b0d] px-4 py-2 text-[12px] font-semibold text-white">
                    Get started
                  </button>
                </div>
              </nav>

              <div className="relative mx-3 mb-3 overflow-hidden rounded-2xl px-6 pt-10 pb-12 text-center text-white" style={{ backgroundColor: BLUE }}>
                <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#7fa3ff]/50 blur-2xl" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-[#9bb8ff]/40 blur-2xl" />

                <a href="#features" className="relative mx-auto inline-flex items-center gap-2 rounded-md bg-[#0a0b0d] px-3 py-1.5 text-[11px] font-medium text-white">
                  New: voice channels are live <ArrowRight size={12} />
                </a>
                <PixelInvader className="absolute left-6 top-16 hidden h-14 w-14 md:block" />

                <h1 className="relative mx-auto mt-8 font-display text-[44px] leading-[0.95] font-extrabold tracking-[-0.04em] sm:text-[60px] md:text-[76px]">
                  Build together
                  <br />
                  <span className="relative inline-block -rotate-2 rounded-2xl bg-white px-4 py-1 text-[#0a0b0d] shadow-[0_8px_0_0_#0a0b0d]">for developers</span>
                </h1>
                <p className="relative mx-auto mt-6 max-w-md text-[13px] leading-relaxed text-white/85">
                  Channels, voice, a shared whiteboard and an agent builder in one live workspace. Every change reaches everyone.
                </p>

                <div className="absolute bottom-6 left-8 hidden w-40 -rotate-3 rounded-2xl bg-white p-2 shadow-xl md:block">
                  <img src={HERO_FIGURE} alt="" className="h-40 w-full rounded-xl object-cover" draggable={false} />
                </div>
                <div className="absolute right-8 top-10 hidden w-48 rotate-3 rounded-2xl bg-white p-3 text-left text-[#0a0b0d] shadow-xl md:block">
                  <p className="font-mono text-[10px] text-[#0a0b0d]/50">#react-vite</p>
                  <p className="mt-1 text-[12px] font-semibold">dan_abramov</p>
                  <p className="text-[11.5px] text-[#0a0b0d]/70">Throttle socket updates to 60ms.</p>
                  <p className="mt-2 text-[12px] font-semibold">gemini</p>
                  <p className="text-[11.5px] text-[#0a0b0d]/70">Debounce typing events separately.</p>
                </div>

                <div className="relative mx-auto mt-8 inline-flex items-center gap-1 rounded-2xl bg-white p-1.5 shadow-lg">
                  <button type="button" onClick={() => onGetStarted()} className="rounded-xl bg-[#0a0b0d] px-5 py-2.5 text-[13px] font-semibold text-white">
                    Open an account
                  </button>
                  <button type="button" onClick={() => scrollToSection('pricing')} className="rounded-xl px-5 py-2.5 text-[13px] font-semibold text-[#0a0b0d]">
                    See pricing
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Trust strip */}
      <section className="px-5 py-14">
        <Reveal className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3">
          <p className="w-full text-center text-[13px] font-semibold text-[#0a0b0d]/50">Built with the tools developers already use</p>
          {['React 19', 'Express', 'Socket.io', 'Prisma', 'Gemini API', 'Firebase', 'Tailwind v4', 'TypeScript'].map((t) => (
            <span key={t} className="rounded-full bg-[#f4f5fb] px-4 py-2 font-mono text-[12.5px] font-semibold">
              {t}
            </span>
          ))}
        </Reveal>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle label="Features" title={<>Everything your team<br />needs in one place</>} lead="Six tools that share one live workspace, so nothing waits on a tab switch." />
          </Reveal>
          <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body, tone }, i) => (
              <Reveal key={title} delay={(i % 3) * 100} className="h-full">
                <article
                  className={cx(
                    'flex h-full flex-col rounded-3xl p-7',
                    tone === 'blue' && 'text-white',
                    tone === 'white' && 'border border-[#0a0b0d]/10 bg-white',
                    tone === 'pale' && 'bg-[#f4f5fb]',
                  )}
                  style={tone === 'blue' ? { backgroundColor: BLUE } : undefined}
                >
                  <span
                    className={cx('flex h-12 w-12 items-center justify-center rounded-2xl', tone === 'blue' ? 'bg-white text-[#2f5bff]' : 'bg-[#2f5bff] text-white')}
                  >
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                  <h3 className="mt-8 font-display text-[22px] leading-tight font-bold tracking-[-0.02em]">{title}</h3>
                  <p className={cx('mt-3 text-[14.5px] leading-relaxed', tone === 'blue' ? 'text-white/80' : 'text-[#0a0b0d]/60')}>{body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 bg-[#f4f5fb] px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle label="How it works" title={<>Live in three steps</>} lead="From sign-up to working together in a few minutes." />
          </Reveal>
          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 120} className="h-full">
                <div className="flex h-full flex-col rounded-3xl bg-white p-8">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0a0b0d] font-display text-[18px] font-bold text-white">{s.n}</span>
                  <h3 className="mt-8 font-display text-[24px] leading-tight font-bold tracking-[-0.02em]">{s.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#0a0b0d]/60">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Workspace preview on a blue card */}
      <section className="px-5 py-24">
        <Reveal className="mx-auto max-w-6xl rounded-[32px] px-6 py-16 md:px-14" >
          <div className="rounded-[32px] px-6 py-16 md:px-14" style={{ backgroundColor: BLUE }}>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="text-white">
                <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold">Command console</span>
                <h2 className="mt-5 font-display text-[40px] leading-[1.02] font-extrabold tracking-[-0.035em] md:text-[52px]">Your whole workspace, one keystroke away.</h2>
                <p className="mt-5 max-w-md text-[16px] leading-relaxed text-white/80">Press Ctrl + ` from anywhere for stats, who is online and a direct line to Gemini.</p>
                <button type="button" onClick={() => onGetStarted()} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-[14px] font-semibold text-[#0a0b0d]">
                  Create an account <ArrowRight size={16} />
                </button>
              </div>
              <div className="rounded-3xl bg-[#0a0b0d] p-6 font-mono text-[13px] leading-relaxed text-white/85">
                <p>
                  <span className="text-[#3ddc97]">$</span> stats
                </p>
                <p className="text-white/60">developers 4 online</p>
                <p className="mt-3">
                  <span className="text-[#3ddc97]">$</span> ai explain CRDTs in one line<span className="animate-blink">▍</span>
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Product preview */}
      <section className="px-5 pb-24">
        <Reveal className="mx-auto max-w-5xl">
          <WorkspaceScreen />
        </Reveal>
      </section>

      {/* Self-host */}
      <section id="self-host" className="scroll-mt-24 bg-[#f4f5fb] px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle label="Run it your way" title={<>Hosted or self-hosted</>} lead="Start with zero setup. Add a database, your own AI key and webhooks when your team needs them." />
          </Reveal>
          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SELF_HOST.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 80} className="h-full">
                <div className="flex h-full flex-col rounded-3xl bg-white p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef2ff] text-[#2f5bff]">
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-6 font-display text-[18px] font-bold">{title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#0a0b0d]/60">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle label="Pricing" title={<>Start free, grow when ready</>} lead="Start free. Upgrade from your profile whenever you like." />
          </Reveal>
          <div className="mt-16 grid gap-5 md:grid-cols-3">
            {PLANS.map((p, i) => {
              const Icon = p.icon;
              const dark = p.tone === 'black';
              const blue = p.tone === 'blue';
              return (
                <Reveal key={p.name} delay={i * 100} className="h-full">
                  <div
                    className={cx('flex h-full flex-col rounded-3xl p-8', p.tone === 'white' && 'border border-[#0a0b0d]/10 bg-white', dark && 'bg-[#0a0b0d] text-white', blue && 'text-white')}
                    style={blue ? { backgroundColor: BLUE } : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-[20px] font-bold">{p.name}</h3>
                      <span className={cx('flex h-10 w-10 items-center justify-center rounded-xl', dark || blue ? 'bg-white/15' : 'bg-[#eef2ff] text-[#2f5bff]')}>
                        <Icon size={18} />
                      </span>
                    </div>
                    <p className="mt-8 font-display text-[56px] leading-none font-extrabold tracking-[-0.04em]">{p.price}</p>
                    <p className={cx('mt-2 text-[13px]', dark || blue ? 'text-white/60' : 'text-[#0a0b0d]/50')}>{p.period}</p>
                    <p className={cx('mt-6 text-[14.5px]', dark || blue ? 'text-white/75' : 'text-[#0a0b0d]/65')}>{p.blurb}</p>
                    <ul className="mt-6 flex-1 space-y-3">
                      {p.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2.5 text-[14px]">
                          <Check size={15} className="mt-0.5 flex-shrink-0" /> {pt}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => onGetStarted(p.key)}
                      className={cx(
                        'mt-8 w-full rounded-xl py-3 text-[14px] font-semibold transition-transform hover:scale-[1.01]',
                        p.tone === 'white' && 'bg-[#0a0b0d] text-white',
                        blue && 'bg-white text-[#0a0b0d]',
                        dark && 'bg-white text-[#0a0b0d]',
                      )}
                    >
                      {p.cta}
                    </button>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 bg-[#f4f5fb] px-5 py-24">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_1.3fr]">
          <Reveal>
            <span className="inline-block rounded-full bg-[#eef2ff] px-3 py-1 text-[12px] font-semibold text-[#2f5bff]">FAQ</span>
            <h2 className="mt-5 font-display text-[44px] leading-[1.02] font-extrabold tracking-[-0.035em]">Good questions</h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-[#0a0b0d]/60">Still stuck? Sign up and press Ctrl + ` to explore the workspace first.</p>
          </Reveal>
          <Reveal delay={120}>
            <div className="divide-y divide-[#0a0b0d]/10 rounded-3xl bg-white px-7">
              {FAQS.map((f) => (
                <details key={f.q} className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[16px] font-semibold">
                    {f.q}
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#f4f5fb] transition-transform group-open:rotate-45">
                      <Plus size={16} />
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-[#0a0b0d]/65">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="px-5 py-24">
        <Reveal className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[32px] px-6 py-20 text-center text-white md:py-24" style={{ backgroundColor: BLUE }}>
            <div aria-hidden="true" className="pointer-events-none absolute -left-10 top-6 h-40 w-40 rounded-full bg-[#7fa3ff]/50 blur-2xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 bottom-4 h-44 w-44 rounded-full bg-[#9bb8ff]/40 blur-2xl" />
            <h2 className="relative font-display text-[44px] leading-[1] font-extrabold tracking-[-0.035em] md:text-[64px]">
              Keep your team's
              <br />
              <span className="inline-block -rotate-2 rounded-2xl bg-white px-4 py-1 text-[#0a0b0d] shadow-[0_8px_0_0_#0a0b0d]">pulse</span>
            </h2>
            <p className="relative mx-auto mt-8 max-w-xl text-[16px] leading-relaxed text-white/80">Create a free account and bring your channels, board and agents into one place.</p>
            <div className="relative mt-10 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => onGetStarted()} className="rounded-xl bg-[#0a0b0d] px-6 py-3 text-[14px] font-semibold text-white">
                Start for free
              </button>
              <button type="button" onClick={onSignIn} className="rounded-xl bg-white px-6 py-3 text-[14px] font-semibold text-[#0a0b0d]">
                Sign in
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0b0d] px-6 pt-16 pb-8 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Wordmark />
              <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-white/60">A live workspace for developer teams: channels, a shared board, agents and voice in one place.</p>
            </div>
            {[
              { title: 'Product', links: [['Features', '#features'], ['How it works', '#how-it-works'], ['Pricing', '#pricing']] },
              { title: 'Resources', links: [['Source on GitHub', 'https://github.com/arg0506/Devpulse'], ['README and setup', 'https://github.com/arg0506/Devpulse#readme']] },
              { title: 'Account', links: [['Sign in', '#signin'], ['Create account', '#signup']] },
            ].map((col) => (
              <div key={col.title}>
                <h3 className="font-mono text-[12px] text-white/45">{col.title}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <a href={href} className="text-[14px] text-white/80 hover:text-white" {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-[12px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Lemo · MIT licensed</p>
            <p>React 19 · Express · Socket.io · Prisma · Gemini</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
