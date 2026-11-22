import dns from 'dns/promises';
import net from 'net';

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  siteName?: string;
  image?: string;
}

const MAX_BYTES = 200_000;
const TIMEOUT_MS = 4000;
const MAX_REDIRECTS = 3;

/**
 * True only for addresses on the public internet. Loopback, private ranges, link-local
 * (including cloud metadata at 169.254.169.254), multicast and reserved ranges are refused,
 * so a link cannot be used to reach the server's own network.
 */
export function isPublicAddress(address: string): boolean {
  const version = net.isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 192 && b === 0) return false;
    if (a >= 224) return false;
    return true;
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    if (lower === '::1' || lower === '::') return false;
    if (lower.startsWith('fe80') || lower.startsWith('fc') || lower.startsWith('fd')) return false;
    if (lower.startsWith('ff')) return false;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isPublicAddress(mapped[1]);
    return true;
  }
  return false;
}

/** Pulls the Open Graph (or plain HTML) fields a preview card needs. */
export function parseOpenGraph(html: string, pageUrl: string): Omit<LinkPreview, 'url'> {
  const meta = (name: string): string | undefined => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i');
    const tag = re.exec(html)?.[0];
    const content = tag ? /content=["']([^"']*)["']/i.exec(tag)?.[1] : undefined;
    return content ? decodeEntities(content).trim().slice(0, 300) : undefined;
  };
  const title = meta('og:title') || meta('twitter:title') || decodeEntities(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] || '').trim();
  const image = meta('og:image') || meta('twitter:image');
  let absoluteImage: string | undefined;
  if (image) {
    try {
      const resolved = new URL(image, pageUrl);
      if (resolved.protocol === 'https:' || resolved.protocol === 'http:') absoluteImage = resolved.toString();
    } catch {
      absoluteImage = undefined;
    }
  }
  return {
    title: title ? title.slice(0, 200) : undefined,
    description: meta('og:description') || meta('description'),
    siteName: meta('og:site_name'),
    image: absoluteImage,
  };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Resolves a hostname and refuses it unless every address it maps to is public. */
async function assertPublicHost(hostname: string): Promise<void> {
  if (net.isIP(hostname)) {
    if (!isPublicAddress(hostname)) throw new Error('That address is not public.');
    return;
  }
  const records = await dns.lookup(hostname, { all: true });
  if (records.length === 0 || records.some((r) => !isPublicAddress(r.address))) {
    throw new Error('That address is not public.');
  }
}

/** Fetches a public page and returns its preview. Throws on anything unsafe or unreachable. */
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview> {
  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    throw new Error('That is not a valid link.');
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== 'http:' && current.protocol !== 'https:') throw new Error('Only web links can be previewed.');
    if (current.username || current.password) throw new Error('Links with credentials cannot be previewed.');
    await assertPublicHost(current.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': 'LemoLinkPreview/1.0', accept: 'text/html' },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        current = new URL(res.headers.get('location')!, current);
        continue;
      }
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.includes('text/html')) throw new Error('No preview is available for that link.');
      const html = await readLimited(res, MAX_BYTES);
      return { url: rawUrl, ...parseOpenGraph(html, current.toString()) };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('That link redirects too many times.');
}

async function readLimited(res: Response, limit: number): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < limit) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => undefined);
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8').slice(0, limit);
}

const cache = new Map<string, { at: number; preview: LinkPreview }>();
const CACHE_MS = 10 * 60 * 1000;

/** Cached wrapper, so the same link is only fetched once every ten minutes. */
export async function cachedLinkPreview(url: string): Promise<LinkPreview> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.preview;
  const preview = await fetchLinkPreview(url);
  cache.set(url, { at: Date.now(), preview });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return preview;
}
