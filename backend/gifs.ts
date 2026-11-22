/**
 * GIF search through Tenor. Enabled only when TENOR_API_KEY is set; without it the chat
 * simply does not show the GIF button.
 */
export interface GifResult {
  id: string;
  title: string;
  preview: string;
  url: string;
}

export function gifsEnabled(): boolean {
  return !!process.env.TENOR_API_KEY;
}

/** Only links served from Tenor's media hosts can be posted as GIFs. */
export const GIF_HOST = /^https:\/\/(media|media[0-9]|c)\.tenor\.com\//;

export function isAllowedGifUrl(url: string): boolean {
  return GIF_HOST.test(url);
}

export async function searchGifs(query: string): Promise<GifResult[]> {
  const key = process.env.TENOR_API_KEY;
  if (!key) throw new Error('GIF search is not set up on this server.');
  const params = new URLSearchParams({
    q: query.slice(0, 80),
    key,
    client_key: 'lemo',
    limit: '24',
    media_filter: 'gif,tinygif',
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`https://tenor.googleapis.com/v2/search?${params}`, { signal: controller.signal });
    if (!res.ok) throw new Error('GIF search is unavailable right now.');
    const data: any = await res.json();
    return (data.results || [])
      .map((r: any) => ({
        id: String(r.id),
        title: String(r.content_description || '').slice(0, 120),
        preview: r.media_formats?.tinygif?.url,
        url: r.media_formats?.gif?.url,
      }))
      .filter((r: GifResult) => r.preview && r.url && isAllowedGifUrl(r.url) && isAllowedGifUrl(r.preview));
  } finally {
    clearTimeout(timer);
  }
}
