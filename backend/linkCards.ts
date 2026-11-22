import { LinkCard, LinkKey } from '../frontend/types';

// ---------- Profile links ----------

export const LINK_FIELDS: { key: LinkKey; label: string; hosts: string[] | null }[] = [
  { key: 'website', label: 'Website', hosts: null },
  { key: 'github', label: 'GitHub', hosts: ['github.com'] },
  { key: 'linkedin', label: 'LinkedIn', hosts: ['linkedin.com'] },
  { key: 'x', label: 'X', hosts: ['x.com', 'twitter.com'] },
  { key: 'stackoverflow', label: 'Stack Overflow', hosts: ['stackoverflow.com'] },
  { key: 'devto', label: 'dev.to', hosts: ['dev.to'] },
  { key: 'medium', label: 'Medium', hosts: ['medium.com'] },
  { key: 'youtube', label: 'YouTube', hosts: ['youtube.com', 'youtu.be'] },
  { key: 'hashnode', label: 'Hashnode', hosts: ['hashnode.com', 'hashnode.dev'] },
  { key: 'kaggle', label: 'Kaggle', hosts: ['kaggle.com'] },
  { key: 'codepen', label: 'CodePen', hosts: ['codepen.io'] },
];

const hostIs = (host: string, allowed: string) => host === allowed || host.endsWith('.' + allowed);

function parseWebUrl(raw: string): URL | null {
  const value = raw.trim();
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Validates the links on a profile. Returns only the keys that have a value; throws with a
 * readable message for the first link that is not a web address or not on its own site.
 */
export function parseLinks(input: unknown): Partial<Record<LinkKey, string>> {
  if (!input || typeof input !== 'object') return {};
  const source = input as Record<string, unknown>;
  const out: Partial<Record<LinkKey, string>> = {};
  for (const field of LINK_FIELDS) {
    const raw = typeof source[field.key] === 'string' ? (source[field.key] as string).trim() : '';
    if (!raw) continue;
    let value = raw;
    // A bare handle is enough for GitHub and X: "alexg" or "@alexg".
    if (field.key === 'github' && /^[a-z0-9-]{1,39}$/i.test(raw)) value = `https://github.com/${raw}`;
    if (field.key === 'x' && /^@?[a-z0-9_]{1,15}$/i.test(raw)) value = `https://x.com/${raw.replace(/^@/, '')}`;
    const url = parseWebUrl(value);
    if (!url) throw new Error(`${field.label} must be a web address.`);
    if (field.hosts && !field.hosts.some((h) => hostIs(url.hostname.toLowerCase(), h))) {
      throw new Error(`${field.label} must be a ${field.hosts[0]} link.`);
    }
    out[field.key] = url.toString().slice(0, 200);
  }
  return out;
}

// ---------- Shared links in chat ----------

interface PlatformRule {
  test: (host: string) => boolean;
  platform: string;
  kind: LinkCard['kind'];
}

const PLATFORMS: PlatformRule[] = [
  // Event platforms
  { test: (h) => hostIs(h, 'meetup.com'), platform: 'Meetup', kind: 'event' },
  { test: (h) => hostIs(h, 'lu.ma') || hostIs(h, 'luma.com'), platform: 'Luma', kind: 'event' },
  { test: (h) => /(^|\.)eventbrite\./.test(h), platform: 'Eventbrite', kind: 'event' },
  { test: (h) => hostIs(h, 'partiful.com'), platform: 'Partiful', kind: 'event' },
  { test: (h) => hostIs(h, 'hopin.com'), platform: 'Hopin', kind: 'event' },
  { test: (h) => hostIs(h, 'airmeet.com'), platform: 'Airmeet', kind: 'event' },
  { test: (h) => hostIs(h, 'ti.to'), platform: 'Tito', kind: 'event' },
  { test: (h) => hostIs(h, 'sessionize.com'), platform: 'Sessionize', kind: 'event' },
  { test: (h) => hostIs(h, 'devpost.com'), platform: 'Devpost', kind: 'event' },
  { test: (h) => hostIs(h, 'mlh.io'), platform: 'MLH', kind: 'event' },
  { test: (h) => hostIs(h, 'gdg.community.dev'), platform: 'Google Developer Groups', kind: 'event' },
  { test: (h) => hostIs(h, 'calendar.google.com'), platform: 'Google Calendar', kind: 'event' },
  { test: (h) => hostIs(h, 'cal.com') || hostIs(h, 'calendly.com'), platform: 'Calendar booking', kind: 'event' },
  // Calls
  { test: (h) => hostIs(h, 'zoom.us'), platform: 'Zoom', kind: 'call' },
  { test: (h) => hostIs(h, 'meet.google.com'), platform: 'Google Meet', kind: 'call' },
  { test: (h) => hostIs(h, 'teams.microsoft.com') || hostIs(h, 'teams.live.com'), platform: 'Microsoft Teams', kind: 'call' },
  { test: (h) => hostIs(h, 'whereby.com'), platform: 'Whereby', kind: 'call' },
  // Communities
  { test: (h) => hostIs(h, 'discord.gg') || hostIs(h, 'discord.com'), platform: 'Discord', kind: 'community' },
  { test: (h) => hostIs(h, 't.me') || hostIs(h, 'telegram.me'), platform: 'Telegram', kind: 'community' },
  { test: (h) => hostIs(h, 'chat.whatsapp.com'), platform: 'WhatsApp', kind: 'community' },
];

/** Recognises the platform behind a web address. Unknown sites are plain links. */
export function classifyLink(url: URL): LinkCard {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const rule = PLATFORMS.find((r) => r.test(host));
  return {
    url: url.toString().slice(0, 500),
    host,
    platform: rule ? rule.platform : host,
    kind: rule ? rule.kind : 'link',
  };
}

/** The card for the first web address in a message, if there is one. */
export function detectLinkCard(text: string): LinkCard | undefined {
  const match = text.match(/https?:\/\/[^\s<>()]+/i);
  if (!match) return undefined;
  const url = parseWebUrl(match[0].replace(/[.,;:!?]+$/, ''));
  return url ? classifyLink(url) : undefined;
}
