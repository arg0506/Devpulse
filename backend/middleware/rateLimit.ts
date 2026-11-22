import { Request, Response, NextFunction } from 'express';

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Length of the window in milliseconds. */
  windowMs: number;
  /** Requests allowed per window for each key. */
  max: number;
}

/**
 * Counts one request for `key` in a fixed window. Returns false once the key is over its limit.
 * Kept separate from Express so the rule can be tested on its own.
 */
export function consume(store: Map<string, Window>, key: string, options: RateLimitOptions, now = Date.now()): boolean {
  const current = store.get(key);
  if (!current || now >= current.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= options.max;
}

/**
 * Express middleware that limits requests per client address. Use it for endpoints that
 * check passwords, so they cannot be guessed at speed.
 */
export function rateLimit(options: RateLimitOptions, message: string) {
  const store = new Map<string, Window>();
  // Drop expired windows now and then so the map cannot grow without bound.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, w] of store) if (now >= w.resetAt) store.delete(key);
  }, options.windowMs);
  sweep.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    if (consume(store, key, options)) return next();
    const retrySeconds = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', String(retrySeconds));
    return res.status(429).json({ error: message });
  };
}
