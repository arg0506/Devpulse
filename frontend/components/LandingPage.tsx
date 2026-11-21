import React from 'react';
import { ArrowRight, Check, Hash, PenTool, Workflow, SquareTerminal } from 'lucide-react';
import { Button, Wordmark, cx } from './ui';

interface LandingPageProps {
  onGetStarted: (plan?: 'pro' | 'enterprise') => void;
  onSignIn: () => void;
}

// Each beat on the hero trace is a real kind of moment in the workspace.
const BEATS = [
  { x: 150, time: '09:41', where: '#react-vite', what: 'dan_abramov shared useThrottle.ts' },
  { x: 440, time: '09:42', where: 'board', what: '3 shapes added to the auth flow' },
  { x: 730, time: '09:44', where: 'agent', what: 'support responder posted to #bugs' },
  { x: 1020, time: '09:45', where: '@gemini', what: 'answered a Prisma question' },
];

function tracePath(width: number, base: number): string {
  let d = `M0 ${base}`;
  for (const { x } of BEATS) {
    d += ` L${x - 46} ${base} q8 -10 16 0 L${x - 8} ${base} L${x} ${base - 58} L${x + 9} ${base + 30} L${x + 16} ${base} L${x + 40} ${base} q10 -12 20 0`;
  }
  return d + ` L${width} ${base}`;
}

function HeroTrace() {
  const width = 1200;
  const base = 72;
  const d = tracePath(width, base);
  return (
    <div className="relative mt-16" aria-hidden="true">
      <svg viewBox={`0 0 ${width} 130`} className="h-auto w-full overflow-visible">
        <path
          d={`M0 ${base} H${width}`}
          className="stroke-line-strong"
          strokeWidth="1"
          strokeDasharray="2 6"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={d}
          fill="none"
          stroke="var(--c-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ strokeDasharray: 2400, ['--len' as any]: 2400, animation: 'pulse-draw 2.4s cubic-bezier(0.6, 0, 0.2, 1) both' }}
        />
        <g className="motion-reduce:hidden" opacity="0">
          <set attributeName="opacity" to="1" begin="2.4s" fill="freeze" />
          <circle r="11" fill="var(--c-accent)" opacity="0.16">
            <animateMotion dur="9s" begin="2.4s" repeatCount="indefinite" path={d} />
          </circle>
          <circle r="4.5" fill="var(--c-accent)">
            <animateMotion dur="9s" begin="2.4s" repeatCount="indefinite" path={d} />
          </circle>
        </g>
      </svg>
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 md:block md:h-12">
        {BEATS.map((b, i) => (
          <div
            key={b.x}
            className="animate-fade-up md:absolute md:w-56 md:-translate-x-1/2"
            style={{ left: `${(b.x / width) * 100}%`, animationDelay: `${600 + i * 350}ms` }}
          >
            <p className="font-mono text-[11px] text-ink-3">
              {b.time} <span className="text-ink">{b.where}</span>
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-2">{b.what}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Miniature previews of each module ----------

function ChatPreview() {
  return (
    <div className="space-y-2.5">
      {[
        ['⚛️', 'dan_abramov', 'Throttle socket updates to 60ms and the jank goes away.'],
        ['🐍', 'alex_g', 'Shipping that to node-api now.'],
        ['✨', 'gemini', 'Tip: debounce typing events separately.'],
      ].map(([e, u, t]) => (
        <div key={u} className="flex gap-2">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-subtle text-[12px]">{e}</span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-ink">{u}</p>
            <p className="truncate text-[11.5px] text-ink-2">{t}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function BoardPreview() {
  return (
    <svg viewBox="0 0 260 110" className="h-[110px] w-full" aria-hidden="true">
      <defs>
        <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" className="fill-line-strong" />
        </pattern>
      </defs>
      <rect width="260" height="110" fill="url(#dots)" />
      <rect x="14" y="36" width="64" height="34" rx="6" className="fill-surface stroke-ink" strokeWidth="1.3" />
      <text x="46" y="57" textAnchor="middle" className="fill-ink font-mono" fontSize="10">
        client
      </text>
      <rect x="110" y="16" width="64" height="34" rx="6" className="fill-surface stroke-ink" strokeWidth="1.3" />
      <text x="142" y="37" textAnchor="middle" className="fill-ink font-mono" fontSize="10">
        api
      </text>
      <ellipse cx="214" cy="78" rx="34" ry="17" className="fill-surface" stroke="var(--c-accent)" strokeWidth="1.3" />
      <text x="214" y="81" textAnchor="middle" className="fill-ink font-mono" fontSize="10">
        postgres
      </text>
      <path d="M78 50 L108 36" className="stroke-ink-2" strokeWidth="1.3" />
      <path d="M174 40 Q205 45 210 60" className="stroke-ink-2" strokeWidth="1.3" fill="none" />
    </svg>
  );
}

function AgentPreview() {
  const nodes = ['Ticket', 'Search docs', 'Gemini', 'Post'];
  return (
    <div className="flex items-center gap-1.5 overflow-hidden py-6">
      {nodes.map((n, i) => (
        <React.Fragment key={n}>
          <span
            className={cx(
              'rounded-md border px-2 py-1.5 font-mono text-[10.5px] whitespace-nowrap',
              i === 2 ? 'border-accent text-ink' : 'border-line-strong text-ink-2',
            )}
          >
            {n}
          </span>
          {i < nodes.length - 1 && <span className="h-px w-3 flex-shrink-0 bg-line-strong" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function ConsolePreview() {
  return (
    <div className="rounded-lg bg-console p-3 font-mono text-[11px] leading-relaxed text-console-ink">
      <p>
        <span className="text-[#8a909c]">$</span> stats
      </p>
      <p>
        developers <span className="text-[#35c387]">4</span> online
      </p>
      <p>
        ai <span className="text-[#35c387]">gemini-3.5-flash</span>
      </p>
      <p>
        <span className="text-[#8a909c]">$</span> ai explain CRDTs in one line<span className="animate-blink">▍</span>
      </p>
    </div>
  );
}

const MODULES = [
  {
    icon: Hash,
    title: 'Channels, threads and DMs',
    body: 'Markdown, code snippets you can run, reactions, threads and presence. Mention @gemini for an answer in context.',
    preview: <ChatPreview />,
  },
  {
    icon: PenTool,
    title: 'Shared whiteboard',
    body: 'Sketch architecture together with shapes, arrows, text and freehand. Everyone sees strokes and cursors live.',
    preview: <BoardPreview />,
  },
  {
    icon: Workflow,
    title: 'Agent studio',
    body: 'Chain triggers, Gemini, web search, JavaScript and actions on a canvas. Run it and watch each step complete.',
    preview: <AgentPreview />,
  },
  {
    icon: SquareTerminal,
    title: 'Console',
    body: 'Press Ctrl + ` from anywhere for workspace stats, who is online, upcoming events and a direct line to Gemini.',
    preview: <ConsolePreview />,
  },
];

const PLANS = [
  {
    key: undefined,
    name: 'Free',
    price: '$0',
    period: 'forever',
    blurb: 'Everything in the workspace for you and your team.',
    points: ['Channels, DMs and threads', 'Whiteboard and agent studio', 'Bring your own Gemini key', 'JSON or PostgreSQL storage'],
    cta: 'Start free',
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    price: '$15',
    period: 'per member / month',
    blurb: 'For teams that live in DevPulse every day.',
    points: ['Everything in Free', 'Pro badge across the workspace', 'Early access to new modules', 'Priority on feature requests'],
    cta: 'Choose Pro',
    featured: true,
  },
  {
    key: 'enterprise' as const,
    name: 'Enterprise',
    price: '$99',
    period: 'per workspace / month',
    blurb: 'For organisations running their own instance.',
    points: ['Everything in Pro', 'Self-hosting guidance', 'SSO setup help', 'Shared support channel'],
    cta: 'Choose Enterprise',
  },
];

export default function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <nav className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Wordmark />
          <div className="flex items-center gap-1">
            <a href="#modules" className="hidden rounded-md px-3 py-1.5 text-[13px] text-ink-2 hover:text-ink sm:block">
              Product
            </a>
            <a href="#pricing" className="hidden rounded-md px-3 py-1.5 text-[13px] text-ink-2 hover:text-ink sm:block">
              Pricing
            </a>
            <Button variant="ghost" size="sm" onClick={onSignIn}>
              Sign in
            </Button>
            <Button variant="primary" size="sm" onClick={() => onGetStarted()}>
              Get started
            </Button>
          </div>
        </div>
      </nav>

      <header className="mx-auto max-w-6xl px-5 pt-20 pb-20 md:pt-28">
        <p className="eyebrow animate-fade-up">A live workspace for developer teams</p>
        <h1
          className="animate-fade-up mt-5 max-w-5xl font-display text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] text-ink sm:text-[64px] md:text-[76px]"
          style={{ animationDelay: '80ms' }}
        >
          Talk, sketch and automate in one place that keeps a pulse.
        </h1>
        <p className="animate-fade-up mt-6 max-w-xl text-[16px] leading-relaxed text-ink-2" style={{ animationDelay: '160ms' }}>
          DevPulse puts channels, a shared whiteboard, a visual agent builder and a console side by side. Every change reaches your team the moment it
          happens.
        </p>
        <div className="animate-fade-up mt-8 flex flex-wrap gap-2" style={{ animationDelay: '240ms' }}>
          <Button variant="primary" size="lg" onClick={() => onGetStarted()}>
            Create your account <ArrowRight size={16} />
          </Button>
          <Button size="lg" onClick={onSignIn}>
            Sign in
          </Button>
        </div>
        <HeroTrace />
      </header>

      <section id="modules" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <h2 className="max-w-md font-display text-[32px] leading-tight font-semibold tracking-[-0.025em]">Four tools, one conversation.</h2>
            <p className="max-w-sm text-ink-2">Switch between them from the left rail. Your place in each one is kept while you move around.</p>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2">
            {MODULES.map(({ icon: Icon, title, body, preview }) => (
              <article key={title} className="flex flex-col bg-surface p-6 md:p-8">
                <div className="flex items-center gap-2 text-ink">
                  <Icon size={16} strokeWidth={1.8} />
                  <h3 className="font-semibold">{title}</h3>
                </div>
                <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-2">{body}</p>
                <div className="mt-6 rounded-lg border border-line bg-canvas p-4">{preview}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="font-display text-[32px] leading-tight font-semibold tracking-[-0.025em]">Pricing</h2>
          <p className="mt-2 text-ink-2">Start free. Upgrade from your profile whenever you like.</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.name} className={cx('flex flex-col rounded-xl border bg-surface p-6', p.featured ? 'border-ink' : 'border-line')}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.featured && <span className="eyebrow text-accent">Popular</span>}
                </div>
                <p className="mt-4 font-display text-[40px] leading-none font-semibold tracking-[-0.03em]">{p.price}</p>
                <p className="mt-1 text-[12px] text-ink-3">{p.period}</p>
                <p className="mt-4 text-[13.5px] text-ink-2">{p.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-[13px] text-ink-2">
                      <Check size={14} className="mt-0.5 flex-shrink-0 text-ink" /> {pt}
                    </li>
                  ))}
                </ul>
                <Button variant={p.featured ? 'primary' : 'secondary'} className="mt-6 w-full" onClick={() => onGetStarted(p.key)}>
                  {p.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-5 py-8 text-[12px] text-ink-3 sm:flex-row sm:items-center">
          <Wordmark />
          <p>React 19 · Express · Socket.io · Prisma · Gemini. MIT licensed.</p>
        </div>
      </footer>
    </div>
  );
}
