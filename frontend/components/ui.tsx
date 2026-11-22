import React, { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { PresenceStatus } from '../types';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

// ---------- Brand ----------

/** The DevPulse mark: a single heartbeat trace in a rounded ink tile. */
export function PulseMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-ink" />
      <path d="M5 17h6l2.5-7 4 13 2.5-6H27" fill="none" stroke="var(--c-accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <PulseMark size={24} />
      <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">DevPulse</span>
    </span>
  );
}

// ---------- Buttons ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-inverse hover:opacity-90 border border-transparent',
  secondary: 'bg-surface text-ink border border-line hover:border-line-strong hover:bg-subtle',
  ghost: 'text-ink-2 hover:text-ink hover:bg-subtle border border-transparent',
  danger: 'bg-surface text-err border border-line hover:border-err/40 hover:bg-err/5',
};
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-[12px] gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-[13px] gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[14px] gap-2 rounded-lg',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-[background,border,opacity,color] duration-150 disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  active,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-subtle text-ink' : 'text-ink-3 hover:bg-subtle hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

// ---------- Avatar & presence ----------

const STATUS_COLOR: Record<PresenceStatus, string> = {
  online: 'bg-ok',
  away: 'bg-warn',
  dnd: 'bg-err',
  offline: 'bg-ink-3/50',
};

export function StatusDot({ status, className }: { status: PresenceStatus; className?: string }) {
  return <span className={cx('block h-2 w-2 rounded-full', STATUS_COLOR[status], className)} aria-label={status} />;
}

export function Avatar({
  emoji,
  size = 32,
  status,
  className,
  src,
}: {
  emoji: string;
  size?: number;
  status?: PresenceStatus;
  className?: string;
  /** Profile photo. Falls back to the emoji when there is none. */
  src?: string;
}) {
  return (
    <span
      className={cx('relative inline-flex flex-shrink-0 items-center justify-center rounded-[28%] bg-subtle select-none', className)}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full rounded-[28%] object-cover" />
      ) : (
        <span aria-hidden="true">{emoji}</span>
      )}
      {status && (
        <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-surface p-[2px]">
          <StatusDot status={status} />
        </span>
      )}
    </span>
  );
}

// ---------- Small pieces ----------

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface px-1 font-mono text-[10px] text-ink-3">
      {children}
    </kbd>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'ok' | 'warn';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-subtle text-ink-2',
    accent: 'bg-accent/12 text-accent',
    ok: 'bg-ok/12 text-ok',
    warn: 'bg-warn/12 text-warn',
  };
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium', tones[tone], className)}>{children}</span>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-3 text-ink-3">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {body && <p className="mt-1 max-w-xs text-[13px] text-ink-3">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cx('inline-flex rounded-lg border border-line bg-subtle p-0.5', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Modal ----------

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 440,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Callers pass a new onClose on every render. Keep the latest in a ref so the effect below
  // does not re-run (and re-focus the first field) each time the parent re-renders while typing.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    window.addEventListener('keydown', onKey);
    const first = panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button:not([data-close])');
    first?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink/25 p-4 pt-[10vh] backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="animate-fade-up w-full rounded-xl border border-line bg-surface shadow-pop"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div>
            <h2 className="font-display text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
            {description && <p className="mt-1 text-[13px] text-ink-3">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} data-close className="-mt-1 -mr-1">
            <X size={16} />
          </IconButton>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- View header ----------

export function ViewHeader({
  title,
  subtitle,
  actions,
  leading,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 md:px-5">
      <div className="flex min-w-0 items-center gap-2">
        {leading}
        <div className="min-w-0">
          <h1 className="truncate text-[14px] font-semibold text-ink">{title}</h1>
          {subtitle && <p className="truncate text-[12px] text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  );
}

export const AVATAR_CHOICES = ['👾', '⚛️', '🦀', '🚀', '🐍', '☕', '🧠', '⚙️', '🎨', '🛰️', '🪐', '🐙'];
export const SKILL_CHOICES = ['TypeScript', 'React', 'Node', 'Rust', 'Go', 'Python', 'PostgreSQL', 'Docker', 'K8s', 'AI/ML', 'Web3', 'Design'];
