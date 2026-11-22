import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  Database,
  Hash,
  KeyRound,
  PenTool,
  Rocket,
  Server,
  Link2,
  Shield,
  Sprout,
  Users,
  Webhook,
  Workflow,
} from 'lucide-react';
import { Button, Wordmark, cx } from './ui';

interface LandingPageProps {
  onGetStarted: (plan?: 'pro' | 'enterprise') => void;
  onSignIn: () => void;
}

// Editor-inspired palette: each colour plays the role of a syntax token.
const COLOR = {
  coral: '#ff6670', // accent / errors
  orange: '#ff9f43', // numbers
  yellow: '#ffd23f', // warnings, highlights
  green: '#3ddc97', // strings, prompts, success
  sky: '#7cc4ff', // functions, links
  violet: '#b49cff', // keywords, AI
  pink: '#ff8fc7', // tags, components
  ink: '#eceef2',
};

// The landing page is always dark. Overriding the theme tokens here keeps every surface consistent.
const DARK_TOKENS = {
  '--c-canvas': '#000000',
  '--c-surface': '#0b0c10',
  '--c-subtle': '#15171d',
  '--c-line': '#1e2129',
  '--c-line-strong': '#2c313c',
  '--c-ink': '#eceef2',
  '--c-ink-2': '#a1a7b3',
  '--c-ink-3': '#6b7280',
  '--c-inverse': '#0a0b0d',
  '--c-accent': '#ff6670',
} as React.CSSProperties;

// The signature gradient, used for headline text, buttons, glows and the footer wordmark.
const GRADIENT = 'linear-gradient(110deg, #b49cff 0%, #ff8fc7 22%, #ff6670 42%, #ff9f43 60%, #ffd23f 76%, #3ddc97 90%, #7cc4ff 100%)';
const GRADIENT_TEXT: React.CSSProperties = {
  backgroundImage: GRADIENT,
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  animation: 'gradient-shift 6s linear infinite',
};

// Illustration shown beside the hero headline.
const HERO_FIGURE = '/hero-figure.jpg';

const FOOTER_WORDS =['channels', 'whiteboard', 'agent_studio', 'console', 'threads', 'gemini', 'presence'];
const DOT_COLORS = [COLOR.coral, COLOR.orange, COLOR.yellow, COLOR.green, COLOR.sky, COLOR.violet, COLOR.pink];

const NAV_LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'self-host', label: 'Self-host' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
];

// Shared hero type: every section heading uses these exact classes.
const DISPLAY_TITLE = 'font-display text-[52px] leading-[0.98] font-extrabold tracking-[-0.04em] sm:text-[72px] md:text-[88px]';
const DISPLAY_LEAD = 'mx-auto mt-6 max-w-xl text-[16px] leading-relaxed';

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/** Fades and lifts its children into place the first time they scroll into view. */
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
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
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

/** Centered heading block with a code-comment eyebrow, reused by every section. */
function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <div id={id} className="mx-auto max-w-4xl scroll-mt-32 text-center">
      {eyebrow && <p className="mb-5 font-mono text-[13px] text-[#3ddc97]">// {eyebrow}</p>}
      <h2 className={cx(DISPLAY_TITLE, 'text-ink')}>{title}</h2>
      {lead && <p className={cx(DISPLAY_LEAD, 'text-ink-2')}>{lead}</p>}
      {children && <div className="mt-8 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

// Sticker-style card: thick outline, hard offset shadow, and a lift on hover. The fill colour is set inline.
const STICKER_CARD =
  'relative flex flex-col overflow-hidden rounded-2xl border-2 border-[#0a0b0d] p-7 text-[#0a0b0d] shadow-[6px_6px_0_0_#0a0b0d] transition-all duration-300 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[9px_9px_0_0_#0a0b0d]';
// Decorative disc in the corner, the artistic detail that makes each card feel hand-made.
const STICKER_BLOB = 'pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full border-2 border-[#0a0b0d] bg-white/40';
const STICKER_ICON = 'flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#0a0b0d] bg-white';

/** Terminal-style window chrome. */
function WindowChrome({ title }: { title: string }) {
  return (
    <div className="flex h-10 items-center gap-2 border-b border-line bg-subtle px-4">
      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      <span className="mx-auto font-mono text-[12px] text-ink-3">{title}</span>
    </div>
  );
}


/** A clean mock of the actual workspace, shown as the hero visual. */
function ProductMockup() {
  const channels = ['general', 'react-vite', 'ai-lounge', 'bugs'];
  const people = [
    { name: 'dan_abramov', color: COLOR.sky, online: true },
    { name: 'alex_g', color: COLOR.green, online: true },
    { name: 'mira_k', color: COLOR.pink, online: false },
    { name: 'gemini', color: COLOR.violet, online: true },
  ];
  const messages = [
    { user: 'dan_abramov', color: COLOR.sky, text: 'Throttle socket updates to 60ms and the jank goes away.' },
    { user: 'alex_g', color: COLOR.green, text: 'Shipping that to node-api now.' },
    { user: 'gemini', color: COLOR.violet, text: 'Tip: debounce typing events separately so the input stays instant.', ai: true },
  ];

  return (
    <div className="relative mx-auto mt-16 max-w-5xl">
      <div aria-hidden="true" className="absolute -inset-x-6 -inset-y-4 rounded-[36px] opacity-30 blur-3xl" style={{ background: GRADIENT }} />
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
        <WindowChrome title="lemo — #react-vite" />
        <div className="grid md:grid-cols-[190px_1fr_200px]">
          <aside className="hidden border-r border-line bg-subtle/50 p-4 md:block">
            <p className="mb-3 font-mono text-[11px] text-ink-3">// channels</p>
            <ul className="space-y-1">
              {channels.map((c) => (
                <li
                  key={c}
                  className={cx(
                    'flex items-center gap-2 rounded-md px-2.5 py-1.5 font-mono text-[12.5px]',
                    c === 'react-vite' ? 'bg-surface text-ink' : 'text-ink-2',
                  )}
                  style={c === 'react-vite' ? { boxShadow: `inset 2px 0 0 ${COLOR.green}` } : undefined}
                >
                  <Hash size={13} /> {c}
                </li>
              ))}
            </ul>
          </aside>
          <section className="flex min-h-[340px] flex-col p-5 md:p-6">
            <div className="space-y-4">
              {messages.map((m) => (
                <div key={m.user} className="flex gap-3">
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md font-mono text-[12px] font-bold text-[#0a0b0d]"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.user[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[12.5px] font-semibold text-ink">
                      {m.user}
                      {m.ai && (
                        <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold text-[#0a0b0d]" style={{ background: GRADIENT }}>
                          AI
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-2 rounded-lg border border-line bg-canvas px-4 py-3 font-mono text-[13px] text-ink-3">
              <span style={{ color: COLOR.green }}>&gt;</span>
              <span className="flex-1">message #react-vite, or try @gemini</span>
              <span className="h-4 w-2 animate-blink bg-ink-2" />
            </div>
          </section>
          <aside className="hidden border-l border-line p-4 md:block">
            <p className="mb-3 font-mono text-[11px] text-ink-3">// online · 3</p>
            <ul className="space-y-3">
              {people.map((p) => (
                <li key={p.name} className="flex items-center gap-2.5">
                  <span className="relative flex h-7 w-7 items-center justify-center rounded-md font-mono text-[11px] font-bold text-[#0a0b0d]" style={{ backgroundColor: p.color }}>
                    {p.name[0]}
                    <span className={cx('absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface', p.online ? 'bg-ok' : 'bg-ink-3')} />
                  </span>
                  <span className={cx('font-mono text-[12px]', p.online ? 'text-ink' : 'text-ink-3')}>{p.name}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

/** Illustration that tilts in 3D toward the pointer and lifts off its shadow on hover. */
function TiltImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const REST = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)';

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 16).toFixed(2)}deg) rotateY(${(x * 20).toFixed(2)}deg) translateZ(24px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = REST;
  };

  return (
    <div className="group relative mx-auto w-full max-w-[340px]" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div
        aria-hidden="true"
        className="absolute inset-x-8 -bottom-5 h-8 rounded-[50%] bg-black opacity-80 blur-xl transition-all duration-300 group-hover:inset-x-4 group-hover:opacity-100"
      />
      <div ref={ref} className="relative will-change-transform transition-transform duration-300 ease-out" style={{ transform: REST }}>
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="w-full rounded-2xl border border-line shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]"
        />
      </div>
    </div>
  );
}

// ---------- Illustrations, drawn in the same palette ----------

function ProfileIllustration() {
  return (
    <svg viewBox="0 0 220 120" className="h-auto w-full" aria-hidden="true">
      <defs>
        <clipPath id="avatar-clip">
          <circle cx="58" cy="60" r="30" />
        </clipPath>
      </defs>
      <rect x="6" y="6" width="208" height="108" rx="10" fill="#15171d" stroke="#2c313c" />
      <circle cx="58" cy="60" r="30" fill={COLOR.sky} />
      <g clipPath="url(#avatar-clip)">
        <circle cx="58" cy="54" r="11" fill="#0a0b0d" />
        <path d="M30 96 Q58 66 86 96 Z" fill="#0a0b0d" />
      </g>
      <rect x="104" y="40" width="88" height="8" rx="4" fill={COLOR.ink} />
      <rect x="104" y="58" width="60" height="6" rx="3" fill={COLOR.ink} fillOpacity="0.25" />
      <rect x="104" y="74" width="74" height="6" rx="3" fill={COLOR.ink} fillOpacity="0.25" />
      <circle cx="186" cy="22" r="11" fill={COLOR.green} />
      <path d="M181 22 l3 3 l6 -6" fill="none" stroke="#0a0b0d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CommunityIllustration() {
  const people = [
    { x: 70, color: COLOR.pink },
    { x: 110, color: COLOR.yellow },
    { x: 150, color: COLOR.sky },
  ];
  return (
    <svg viewBox="0 0 220 120" className="h-auto w-full" aria-hidden="true">
      <rect x="6" y="6" width="208" height="108" rx="10" fill="#15171d" stroke="#2c313c" />
      {people.map((p) => (
        <g key={p.x}>
          <circle cx={p.x} cy="46" r="15" fill={p.color} stroke="#15171d" strokeWidth="3" />
          <circle cx={p.x} cy="44" r="5.5" fill="#0a0b0d" />
          <path d={`M${p.x - 10} 66 Q${p.x} 52 ${p.x + 10} 66 Z`} fill="#0a0b0d" />
        </g>
      ))}
      <rect x="62" y="78" width="96" height="20" rx="5" fill={COLOR.green} />
      <text x="110" y="92" textAnchor="middle" fontSize="9.5" fill="#0a0b0d" className="font-mono">
        rsvp: going ✓
      </text>
    </svg>
  );
}

function FlowIllustration() {
  const path = 'M44 60 H176';
  const nodes = [
    { x: 16, label: 'trigger', color: COLOR.sky },
    { x: 86, label: 'gemini', color: COLOR.violet },
    { x: 156, label: 'post', color: COLOR.green },
  ];
  return (
    <svg viewBox="0 0 220 120" className="h-auto w-full" aria-hidden="true">
      <rect x="6" y="6" width="208" height="108" rx="10" fill="#15171d" stroke="#2c313c" />
      <path d={path} fill="none" stroke={COLOR.ink} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="3 5" />
      {nodes.map((n) => (
        <g key={n.label}>
          <rect x={n.x} y="42" width="48" height="36" rx="6" fill={n.color} />
          <text x={n.x + 24} y="64" textAnchor="middle" fontSize="9" fill="#0a0b0d" className="font-mono">
            {n.label}
          </text>
        </g>
      ))}
      <circle r="4.5" fill={COLOR.coral} className="motion-reduce:hidden">
        <animateMotion dur="2.6s" repeatCount="indefinite" path={path} />
      </circle>
    </svg>
  );
}

function HeartbeatIllustration() {
  const d = 'M0 40 H120 L134 40 L146 12 L160 68 L172 40 H300';
  return (
    <svg viewBox="0 0 300 80" className="h-auto w-full max-w-md" aria-hidden="true">
      <path d={d} fill="none" stroke={COLOR.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="reveal-draw" />
    </svg>
  );
}

function KeyCaps() {
  const cap = 'flex h-12 min-w-12 items-center justify-center rounded-md border border-line-strong bg-surface px-4 font-mono text-[14px] font-semibold text-ink';
  return (
    <div className="mt-10 flex items-center justify-center gap-3" aria-hidden="true">
      <span className={cap} style={{ boxShadow: `0 3px 0 0 #2c313c` }}>
        Ctrl
      </span>
      <span className="font-mono text-[16px] text-ink-3">+</span>
      <span className={cap} style={{ boxShadow: `0 3px 0 0 #2c313c`, color: COLOR.yellow }}>
        `
      </span>
    </div>
  );
}

function ConsolePreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface text-left">
      <WindowChrome title="console" />
      <div className="space-y-1 p-4 font-mono text-[12.5px] leading-relaxed">
        <p>
          <span style={{ color: COLOR.green }}>$</span> <span className="text-ink">stats</span>
        </p>
        <p className="text-ink-2">
          developers <span style={{ color: COLOR.orange }}>4</span> online
        </p>
        <p className="text-ink-2">
          ai <span style={{ color: COLOR.violet }}>gemini-3.5-flash</span>
        </p>
        <p>
          <span style={{ color: COLOR.green }}>$</span> <span className="text-ink">ai explain CRDTs in one line</span>
          <span className="animate-blink">▍</span>
        </p>
      </div>
    </div>
  );
}

// ---------- Content ----------

const FEATURES = [
  {
    icon: Hash,
    title: 'Channels, threads and DMs',
    body: 'Markdown, reactions, pins, typing indicators and presence. Share snippets and run JavaScript right in the message.',
    color: COLOR.sky,
    tag: 'chat',
  },
  {
    icon: PenTool,
    title: 'Shared whiteboard',
    body: 'Shapes, arrows, text and freehand on one board. Everyone sees strokes and cursors live, and you can export a PNG.',
    color: COLOR.yellow,
    tag: 'board',
  },
  {
    icon: Workflow,
    title: 'Agent studio',
    body: 'Chain triggers, Gemini, web search, JavaScript and actions on a canvas. Start from a template and press Run.',
    color: COLOR.violet,
    tag: 'agents',
  },
  {
    icon: Users,
    title: 'Communities with roles',
    body: 'Servers with owners, custom roles and permissions, invite links, and channels that only chosen roles can see.',
    color: COLOR.green,
    tag: 'communities',
  },
  {
    icon: Link2,
    title: 'Rich messages',
    body: 'Replies, edits, @mentions, file uploads, GIFs, link previews and slash commands like /roll and /poll.',
    color: COLOR.pink,
    tag: 'messages',
  },
  {
    icon: Shield,
    title: 'Moderation you can trust',
    body: 'Friends and blocking for you. Timeouts, bans and an audit log for the people who keep a community healthy.',
    color: COLOR.orange,
    tag: 'safety',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Create an account',
    body: 'Sign up with an email or username, then pick your role, skills and avatar.',
    color: COLOR.pink,
    illustration: <ProfileIllustration />,
  },
  {
    n: '02',
    title: 'Join your community',
    body: 'Join communities, each with its own channels, and schedule events with a call link and RSVPs.',
    color: COLOR.orange,
    illustration: <CommunityIllustration />,
  },
  {
    n: '03',
    title: 'Run a workflow',
    body: 'Start from one of the agent templates, press Run and watch each step complete in order.',
    color: COLOR.green,
    illustration: <FlowIllustration />,
  },
];

const SELF_HOST = [
  {
    icon: Database,
    title: 'Zero-setup start',
    code: '# no database needed',
    body: 'Data lives in a local JSON file until you are ready for more.',
    color: COLOR.sky,
  },
  {
    icon: Server,
    title: 'PostgreSQL when you grow',
    code: 'DATABASE_URL="postgresql://…"',
    body: 'Users, messages, communities and events are mirrored with Prisma.',
    color: COLOR.green,
  },
  {
    icon: KeyRound,
    title: 'Your own Gemini key',
    code: 'GEMINI_API_KEY="…"',
    body: 'Enables @gemini replies, the console ai command and search steps.',
    color: COLOR.violet,
  },
  {
    icon: Webhook,
    title: 'Actions to any webhook',
    code: 'POST https://hooks.example.com/…',
    body: 'Agent actions post into a channel or call any public https endpoint.',
    color: COLOR.orange,
  },
];

const PLANS = [
  {
    key: undefined,
    name: 'Free',
    icon: Sprout,
    price: '$0',
    period: 'forever',
    blurb: 'Everything in the workspace for you and your team.',
    points: ['Channels, DMs and threads', 'Whiteboard and agent studio', 'Bring your own Gemini key', 'JSON or PostgreSQL storage'],
    cta: 'Start free',
    color: COLOR.sky,
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    icon: Rocket,
    price: '$15',
    period: 'per member / month',
    blurb: 'For teams that live in Lemo every day.',
    points: ['Everything in Free', 'Pro badge across the workspace', 'Early access to new modules', 'Priority on feature requests'],
    cta: 'Choose Pro',
    featured: true,
    color: COLOR.coral,
  },
  {
    key: 'enterprise' as const,
    name: 'Enterprise',
    icon: Building2,
    price: '$99',
    period: 'per workspace / month',
    blurb: 'For organisations running their own instance.',
    points: ['Everything in Pro', 'Self-hosting guidance', 'SSO setup help', 'Shared support channel'],
    cta: 'Choose Enterprise',
    color: COLOR.violet,
  },
];

const FAQS = [
  {
    q: 'Is there a free plan?',
    a: 'Yes. The Free plan includes channels, DMs, threads, the whiteboard and the agent studio. Bring your own Gemini key to enable AI features.',
  },
  {
    q: 'Do I need a database to run it?',
    a: 'No. Without DATABASE_URL, Lemo stores data in a local JSON file. Add PostgreSQL with Prisma when you need it.',
  },
  {
    q: 'Can I self-host?',
    a: 'Yes. It is one Node server: run npm run build, then npm start. The code is MIT licensed.',
  },
  {
    q: 'What happens without a Gemini key?',
    a: 'AI features still appear, but they answer with an offline notice until you add GEMINI_API_KEY.',
  },
  {
    q: 'Do workflows run on a schedule?',
    a: 'Not yet. Workflows run when you press Run in the studio, using the trigger test input. Scheduled and incoming-webhook triggers need a server-side runner, which is the next step.',
  },
  {
    q: 'Can I hide a channel from some people?',
    a: 'Yes. In a community you can limit a channel to chosen roles. Everyone else cannot see it, join it, read it or post in it.',
  },
  {
    q: 'Do GIFs and link previews work?',
    a: 'Both are optional. GIF search turns on when the server has a Tenor API key. Link previews only fetch public web pages; private and internal addresses are refused.',
  },
  {
    q: 'Is my session safe in the browser?',
    a: 'Sessions live in an HttpOnly cookie that page scripts cannot read. Signing out ends the session on every device, and sign-in is rate limited against guessing.',
  },
];

/** A small pixel-art character for the hero stage. Each string is a row; '#' marks a lit pixel. */
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

/** Soft cloud shapes that frame a headline on wide screens. */
function CloudDecor({ className, flip, color }: { className: string; flip?: boolean; color: string }) {
  return (
    <svg
      viewBox="0 0 160 110"
      className={cx('pointer-events-none absolute hidden w-36 opacity-60 xl:block', className)}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
    >
      <g fill={color}>
        <circle cx="50" cy="66" r="30" />
        <circle cx="88" cy="52" r="36" />
        <circle cx="122" cy="72" r="26" />
        <rect x="30" y="66" width="118" height="30" rx="15" />
      </g>
    </svg>
  );
}

/** Footer: a scrolling token strip, link columns and a giant gradient wordmark. */
function SiteFooter({ onGetStarted, onSignIn }: LandingPageProps) {
  const columns: { title: string; links: { label: string; href?: string; action?: () => void; external?: boolean }[] }[] = [
    {
      title: 'product',
      links: [
        { label: 'features', href: '#features' },
        { label: 'how it works', href: '#how-it-works' },
        { label: 'pricing', href: '#pricing' },
      ],
    },
    {
      title: 'account',
      links: [
        { label: 'sign in', action: onSignIn },
        { label: 'create account', action: () => onGetStarted() },
      ],
    },
    {
      title: 'resources',
      links: [
        { label: 'source on github', href: 'https://github.com/arg0506/Devpulse', external: true },
        { label: 'readme and setup', href: 'https://github.com/arg0506/Devpulse#readme', external: true },
      ],
    },
  ];
  const linkClass = 'font-mono text-[13px] text-ink-2 transition-colors hover:text-ink';

  return (
    <footer className="relative overflow-hidden border-t border-line bg-canvas">
      <div className="overflow-hidden border-b border-line py-5">
        <div className="marquee-track flex w-max font-mono text-[18px] font-semibold tracking-[-0.01em] text-ink-3">
          {[...FOOTER_WORDS, ...FOOTER_WORDS].map((word, i) => (
            <span key={i} className="flex shrink-0 items-center gap-6 pr-6 whitespace-nowrap">
              {word}
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }} />
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <p className="max-w-xs text-[15px] leading-relaxed text-ink-2">
              A live workspace for developer teams: channels, a shared board, agents and a console in one place.
            </p>
            <p className="mt-6 font-mono text-[13px] text-ink-3">
              <span style={{ color: COLOR.green }}>$</span> npm install && npm run dev
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-mono text-[12px] text-ink-3">// {col.title}</h3>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.action ? (
                      <button type="button" onClick={link.action} className={linkClass}>
                        {link.label}
                      </button>
                    ) : (
                      <a href={link.href} className={linkClass} {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div aria-hidden="true" className="pt-16 text-center font-display text-[24vw] leading-[0.8] font-extrabold tracking-[-0.06em] select-none md:text-[200px]">
          <span style={GRADIENT_TEXT}>lemo</span>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line py-6 font-mono text-[12px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} lemo · MIT licensed</p>
          <p>react 19 · express · socket.io · prisma · gemini</p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  return (
    <div className="relative min-h-full text-ink" style={{ ...DARK_TOKENS, backgroundColor: '#000000' }}>

      {/* Hero */}
      {/* Hero: a monitor on a blue stage, with the site inside the screen */}
      <header className="relative overflow-hidden bg-[#0a1a4f] px-4 pt-10 pb-24 md:pt-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
            backgroundSize: '90px 90px, 37px 37px',
            backgroundPosition: '0 0, 17px 23px',
          }}
        />
        <div className="relative mx-auto max-w-5xl">
          {/* Monitor */}
          <div className="animate-fade-up rounded-[28px] bg-[#0b0c10] p-3 shadow-[0_50px_120px_-30px_rgba(37,99,235,0.7)]" style={{ animationDelay: '60ms' }}>
            <div className="overflow-hidden rounded-[18px] bg-white text-[#0a0b0d]">
              {/* Screen navigation */}
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

              {/* Blue hero card */}
              <div className="relative mx-3 mb-3 overflow-hidden rounded-2xl bg-[#2f5bff] px-6 pt-10 pb-12 text-center text-white">
                <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#7fa3ff]/50 blur-2xl" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-[#9bb8ff]/40 blur-2xl" />

                <a href="#features" className="relative mx-auto inline-flex items-center gap-2 rounded-md bg-[#0a0b0d] px-3 py-1.5 text-[11px] font-medium text-white">
                  New: voice channels are live <ArrowRight size={12} />
                </a>

                {/* Decorative pixel character */}
                <PixelInvader className="absolute left-6 top-16 hidden h-14 w-14 md:block" />

                <h1 className="relative mx-auto mt-8 font-display text-[44px] leading-[0.95] font-extrabold tracking-[-0.04em] sm:text-[60px] md:text-[76px]">
                  Build together
                  <br />
                  <span className="relative inline-block -rotate-2 rounded-2xl bg-white px-4 py-1 text-[#0a0b0d] shadow-[0_8px_0_0_#0a0b0d]">
                    for developers
                  </span>
                </h1>
                <p className="relative mx-auto mt-6 max-w-md text-[13px] leading-relaxed text-white/85">
                  Channels, voice, a shared whiteboard and an agent builder in one live workspace. Your team stays in sync, every change reaches everyone.
                </p>

                {/* Side cards */}
                <div className="absolute left-8 bottom-6 hidden w-40 -rotate-3 rounded-2xl bg-white p-2 shadow-xl md:block">
                  <img src={HERO_FIGURE} alt="" className="h-40 w-full rounded-xl object-cover" draggable={false} />
                </div>
                <div className="absolute right-8 top-10 hidden w-48 rotate-3 rounded-2xl bg-white p-3 text-left text-[#0a0b0d] shadow-xl md:block">
                  <p className="font-mono text-[10px] text-[#0a0b0d]/50">#react-vite</p>
                  <p className="mt-1 text-[12px] font-semibold">dan_abramov</p>
                  <p className="text-[11.5px] text-[#0a0b0d]/70">Throttle socket updates to 60ms.</p>
                  <p className="mt-2 text-[12px] font-semibold">gemini</p>
                  <p className="text-[11.5px] text-[#0a0b0d]/70">Debounce typing events separately.</p>
                </div>

                {/* Action pill */}
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
          {/* Stand */}
          <div aria-hidden="true" className="mx-auto h-10 w-44 rounded-b-2xl bg-[#0b0c10]" />
          <div aria-hidden="true" className="mx-auto h-2 w-64 rounded-full bg-[#0b0c10]" />

          <div className="animate-fade-up mt-20" style={{ animationDelay: '400ms' }}>
            <ProductMockup />
          </div>
        </div>
      </header>

      {/* Stack: monospace tags */}
      <section className="border-y border-line bg-surface px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 text-center">
          <p className="font-mono text-[12px] text-ink-3">// built with</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {[
              { t: 'react@19', c: COLOR.sky },
              { t: 'express@4', c: COLOR.green },
              { t: 'socket.io@4', c: COLOR.yellow },
              { t: 'prisma', c: COLOR.violet },
              { t: 'gemini-api', c: COLOR.pink },
              { t: 'tailwind@4', c: COLOR.orange },
              { t: 'typescript', c: COLOR.sky },
            ].map(({ t, c }) => (
              <span key={t} className="rounded-md border border-line bg-canvas px-3 py-1.5 font-mono text-[12.5px]" style={{ color: c }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 px-5 py-28" style={{ backgroundColor: '#050506' }}>
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              eyebrow="features"
              title={
                <>
                  Everything your team
                  <br />
                  <span style={{ color: COLOR.violet }}>needs in one place.</span>
                </>
              }
              lead="Six tools that share one live workspace, so nothing waits on a tab switch."
            />
          </Reveal>
          <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body, color, tag }, i) => (
              <Reveal key={title} delay={(i % 3) * 110} className="h-full">
                <article className={cx(STICKER_CARD, 'h-full')} style={{ backgroundColor: color }}>
                  <span aria-hidden="true" className={STICKER_BLOB} />
                  <div className="relative flex items-center justify-between">
                    <span className={STICKER_ICON}>
                      <Icon size={20} strokeWidth={2.2} />
                    </span>
                    <span className="rounded-md border-2 border-[#0a0b0d] bg-white/70 px-2 py-0.5 font-mono text-[11px] font-semibold">./{tag}</span>
                  </div>
                  <h3 className="relative mt-7 text-[18px] font-bold tracking-[-0.01em]">{title}</h3>
                  <p className="relative mt-2 text-[14px] leading-relaxed text-[#0a0b0d]/80">{body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Highlight cards */}
      <section className="bg-canvas px-5 py-24">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          <Reveal className="h-full">
            <div className="flex h-full min-h-[340px] flex-col justify-between overflow-hidden rounded-xl p-8 text-[#0a0b0d]" style={{ backgroundColor: COLOR.yellow }}>
              <div>
                <p className="font-mono text-[12px] text-[#0a0b0d]/60">// chat</p>
                <h2 className="mt-3 font-display text-[32px] leading-[1.05] font-bold tracking-[-0.03em]">Talk to your team, in context.</h2>
                <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-[#0a0b0d]/75">
                  Threads, reactions and runnable code snippets. Mention @gemini for an answer built from the conversation.
                </p>
              </div>
              <div className="mt-8 rounded-lg bg-[#0a0b0d] p-4 font-mono text-[12px] text-ink">
                <p>
                  <span style={{ color: COLOR.sky }}>dan_abramov</span> <span className="text-ink-2">throttle socket updates to 60ms</span>
                </p>
                <p className="mt-2">
                  <span style={{ color: COLOR.violet }}>gemini</span> <span className="text-ink-2">debounce typing events separately</span>
                </p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120} className="h-full">
            <div className="flex h-full min-h-[340px] flex-col justify-between rounded-xl border border-line bg-surface p-8">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md text-[#0a0b0d]" style={{ backgroundColor: COLOR.green }}>
                    <Hash size={18} />
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-md text-[#0a0b0d]" style={{ backgroundColor: COLOR.pink }}>
                    <PenTool size={18} />
                  </span>
                </div>
                <Button size="sm" variant="secondary" onClick={() => onGetStarted()}>
                  Start building <ArrowRight size={14} />
                </Button>
              </div>
              <div>
                <p className="font-mono text-[12px] text-ink-3">// board + agents</p>
                <h2 className="mt-3 font-display text-[32px] leading-[1.05] font-bold tracking-[-0.03em]">Sketch and automate, live.</h2>
                <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-ink-2">
                  Draw the architecture on a shared board, then chain triggers, Gemini and actions in the agent studio.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
        <div className="mx-auto max-w-6xl">
          <div className="mt-12 flex justify-center">
            <HeartbeatIllustration />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 px-5 py-28" style={{ backgroundColor: '#050506' }}>
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              eyebrow="how it works"
              title={
                <>
                  Live in
                  <br />
                  <span style={{ color: COLOR.orange }}>three</span> <span style={{ color: COLOR.green }}>steps.</span>
                </>
              }
              lead="From sign-up to a running workflow in a few minutes."
            >
              <Button variant="primary" size="lg" onClick={() => onGetStarted()}>
                Get started
              </Button>
            </SectionHeading>
          </Reveal>
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 140} className="h-full">
                <div className={cx(STICKER_CARD, 'h-full text-left')} style={{ backgroundColor: s.color }}>
                  <span aria-hidden="true" className={STICKER_BLOB} />
                  <span className="relative font-mono text-[14px] font-semibold">// step {s.n}</span>
                  <h3 className="relative mt-6 font-display text-[26px] leading-tight font-extrabold tracking-[-0.03em]">{s.title}</h3>
                  <p className="relative mt-3 text-[14px] leading-relaxed text-[#0a0b0d]/80">{s.body}</p>
                  <div className="relative mt-8 overflow-hidden rounded-xl border-2 border-[#0a0b0d]">{s.illustration}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Console */}
      <section className="bg-canvas px-5 py-28">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-line bg-[#050506] px-6 py-24 md:px-12">
            <div className="relative">
              <SectionHeading
                eyebrow="console"
                title={
                  <>
                    Your whole workspace,
                    <br />
                    one keystroke away.
                  </>
                }
                lead="Press Ctrl + ` from anywhere for stats, who is online, upcoming events and a direct line to Gemini."
              >
                <Button variant="primary" size="lg" onClick={() => onGetStarted()}>
                  Create an account
                </Button>
              </SectionHeading>
              <KeyCaps />
              <div className="mx-auto mt-10 max-w-xl">
                <ConsolePreview />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Self-host */}
      <section id="self-host" className="scroll-mt-24 px-5 py-28" style={{ backgroundColor: '#050506' }}>
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              eyebrow="run it your way"
              title={
                <>
                  Hosted or
                  <br />
                  <span style={{ color: COLOR.green }}>self-hosted.</span>
                </>
              }
              lead="Start with zero setup. Add PostgreSQL, your own AI key and webhooks when your team needs them."
            />
          </Reveal>
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SELF_HOST.map(({ icon: Icon, title, code, body, color }, i) => (
              <Reveal key={title} delay={i * 100} className="h-full">
                <div className={cx(STICKER_CARD, 'h-full')} style={{ backgroundColor: color }}>
                  <span aria-hidden="true" className={STICKER_BLOB} />
                  <span className={cx(STICKER_ICON, 'relative')}>
                    <Icon size={18} strokeWidth={2.2} />
                  </span>
                  <h3 className="relative mt-6 text-[18px] font-bold">{title}</h3>
                  <p className="relative mt-3 overflow-x-auto rounded-md border-2 border-[#0a0b0d] bg-[#0a0b0d] px-3 py-2 font-mono text-[12px] whitespace-nowrap" style={{ color }}>
                    {code}
                  </p>
                  <p className="relative mt-3 text-[13.5px] leading-relaxed text-[#0a0b0d]/80">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 bg-canvas px-5 py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              eyebrow="pricing"
              title={
                <>
                  Start free,
                  <br />
                  <span style={{ color: COLOR.coral }}>grow</span> when <span style={{ color: COLOR.sky }}>ready.</span>
                </>
              }
              lead="Start free. Upgrade from your profile whenever you like."
            />
          </Reveal>
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {PLANS.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.name} delay={i * 120} className="h-full">
                  <div
                    className={cx('relative flex h-full flex-col rounded-xl p-8 text-left', p.featured ? '' : 'border border-line bg-surface')}
                    style={
                      p.featured
                        ? {
                            backgroundImage: `linear-gradient(#0b0c10, #0b0c10), ${GRADIENT}`,
                            backgroundOrigin: 'border-box',
                            backgroundClip: 'padding-box, border-box',
                            border: '1px solid transparent',
                            boxShadow: '0 30px 80px -30px rgba(255,102,112,0.45)',
                          }
                        : undefined
                    }
                  >
                    {p.featured && (
                      <span className="absolute -top-3 left-8 rounded px-2.5 py-1 font-mono text-[11px] font-bold text-[#0a0b0d]" style={{ background: GRADIENT }}>
                        most popular
                      </span>
                    )}
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono text-[14px] font-semibold">{p.name.toLowerCase()}</h3>
                      <span className="flex h-9 w-9 items-center justify-center rounded-md" style={{ backgroundColor: `${p.color}1f`, color: p.color }}>
                        <Icon size={16} />
                      </span>
                    </div>
                    <p className="mt-6 font-display text-[56px] leading-none font-extrabold tracking-[-0.04em]">{p.price}</p>
                    <p className="mt-2 font-mono text-[12px] text-ink-3">{p.period}</p>
                    <p className="mt-5 text-[13.5px] text-ink-2">{p.blurb}</p>
                    <ul className="mt-6 flex-1 space-y-2.5">
                      {p.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2 text-[13px] text-ink-2">
                          <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: p.color }} /> {pt}
                        </li>
                      ))}
                    </ul>
                    <Button variant={p.featured ? 'primary' : 'secondary'} className="mt-8 w-full" onClick={() => onGetStarted(p.key)}>
                      {p.cta}
                    </Button>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 px-5 py-28" style={{ backgroundColor: '#050506' }}>
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <div>
              <p className="mb-5 font-mono text-[13px] text-[#3ddc97]">// faq</p>
              <h2 className={cx(DISPLAY_TITLE, 'text-left text-ink md:text-[64px]')}>
                Good
                <br />
                <span style={{ color: COLOR.sky }}>questions.</span>
              </h2>
              <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-ink-2">
                Still stuck? Sign up and press Ctrl + ` to explore the workspace first.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="divide-y divide-line rounded-xl border border-line bg-surface px-7">
              {FAQS.map((f) => (
                <details key={f.q} className="group py-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[16px] font-semibold">
                    <span>
                      <span className="mr-3 font-mono text-[13px]" style={{ color: COLOR.green }}>
                        Q.
                      </span>
                      {f.q}
                    </span>
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-line bg-subtle font-mono text-[15px] leading-none transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-2">
                    <span className="mr-2 font-mono" style={{ color: COLOR.violet }}>
                      A.
                    </span>
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-canvas px-5 py-28">
        <Reveal>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl px-6 py-24 text-center text-[#0a0b0d] md:px-12" style={{ background: GRADIENT }}>
            <CloudDecor className="left-6 top-10" color="#0a0b0d" />
            <CloudDecor className="right-6 top-24" color="#0a0b0d" flip />
            <div className="relative">
              <p className="font-mono text-[13px] text-[#0a0b0d]/60">// ready when you are</p>
              <h2 className={cx(DISPLAY_TITLE, 'mt-5 text-[#0a0b0d]')}>
                Keep your team's
                <br />
                pulse.
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-[#0a0b0d]/75">
                Create a free account and bring your channels, board and agents into one place.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onGetStarted()}
                  className="inline-flex items-center gap-2 rounded-md bg-[#0a0b0d] px-6 py-3 font-semibold text-ink transition-transform hover:scale-[1.03]"
                >
                  Start for free <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="rounded-md border border-[#0a0b0d]/30 bg-white/40 px-6 py-3 font-semibold text-[#0a0b0d] transition-colors hover:bg-white/70"
                >
                  Sign in
                </button>
              </div>
              <div className="mt-14 flex justify-center">
                <HeartbeatIllustration />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter onGetStarted={onGetStarted} onSignIn={onSignIn} />
    </div>
  );
}
