import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const DEV_FALLBACK_SECRET = 'lemo-local-dev-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    // The fallback is public, so anyone could forge sessions with it.
    throw new Error('[auth] JWT_SECRET must be set in production.');
  }
  console.log('[auth] JWT_SECRET not set, using the local development secret.');
}

export interface TokenPayload {
  userId: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/** Tokens carry the account's session version. Signing out bumps it, which invalidates every token issued before. */
export function signToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, ver: db.getSessionVersion(payload.userId) }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string | undefined | null): TokenPayload | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload & { ver?: number };
    if (!decoded?.userId) return null;
    // Tokens issued before a sign-out are no longer accepted.
    if ((decoded.ver ?? 0) !== db.getSessionVersion(decoded.userId)) return null;
    return { userId: decoded.userId, username: decoded.username };
  } catch {
    return null;
  }
}

/** The session travels in an HttpOnly cookie, so page scripts cannot read or copy it. */
export const SESSION_COOKIE = 'lemo_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}${secure}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : readCookie(req.headers.cookie, SESSION_COOKIE);
  if (!token) {
    return res.status(401).json({ error: 'Sign in to continue.' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
  }
  req.user = payload;
  next();
}
