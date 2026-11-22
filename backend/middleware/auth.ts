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

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in to continue.' });
  }
  const payload = verifyToken(header.slice(7));
  if (!payload) {
    return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
  }
  req.user = payload;
  next();
}
