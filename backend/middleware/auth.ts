import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const DEV_FALLBACK_SECRET = 'devpulse-local-dev-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[auth] JWT_SECRET is not set. Set it before deploying; tokens are signed with a public fallback.');
  } else {
    console.log('[auth] JWT_SECRET not set, using the local development secret.');
  }
}

export interface TokenPayload {
  userId: string;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string | undefined | null): TokenPayload | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded?.userId ? { userId: decoded.userId, username: decoded.username } : null;
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
