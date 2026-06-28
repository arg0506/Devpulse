import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'devpulse_jwt_secret_key_9988';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    email: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Get token from auth header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  // Robust dev/preset bypass for fast local development testing
  if (token.startsWith('devuser-')) {
    try {
      // Format: devuser_USERNAME_ID
      const parts = token.split('_');
      const username = parts[1] || 'developer';
      const userId = parts[2] || 'dev-id';
      req.user = {
        userId,
        username,
        email: `${username}@devpulse.local`
      };
      return next();
    } catch (err) {
      console.warn('Dev bypass parsing failed, trying normal JWT verification');
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      email: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT Token Verification Error:', error);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
