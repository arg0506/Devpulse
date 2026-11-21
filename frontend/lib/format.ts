export function timeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

export function eventDate(iso: string): { day: string; month: string; time: string; weekday: string; full: string } {
  const d = new Date(iso);
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString([], { month: 'short' }),
    weekday: d.toLocaleDateString([], { weekday: 'short' }),
    time: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    full: d.toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
  };
}

export function relativeFromNow(iso: string): string {
  const diff = Date.parse(iso) - Date.now();
  const abs = Math.abs(diff);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [86400000, 'day'],
    [3600000, 'hour'],
    [60000, 'minute'],
  ];
  const rtf = new Intl.RelativeTimeFormat([], { numeric: 'auto' });
  for (const [ms, unit] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return 'now';
}

export function isFreeTier(tier?: string): boolean {
  return tier !== 'Pro' && tier !== 'Enterprise';
}
