import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { toPublicProfile } from '../realtime';

const router = Router();

/** Profile photos are PNG, JPEG or WebP data URLs. The client resizes them to 256px before upload. */
const AVATAR_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
export const MAX_AVATAR_CHARS = 300_000;

export function isValidAvatar(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_AVATAR_CHARS && AVATAR_RE.test(value);
}

// A public profile: anyone signed in can read it, just as they can see a name in a channel.
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'That profile does not exist.' });
  return res.json(toPublicProfile(user));
});

// Photos load straight into <img> tags, which cannot send a token, so they are public like avatars on any social site.
router.get('/:id/avatar', (req, res) => {
  const user = db.getUser(req.params.id);
  const match = user?.avatarImage?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) return res.status(404).end();
  res.set('Content-Type', match[1]);
  res.set('Cache-Control', 'public, max-age=3600');
  return res.send(Buffer.from(match[2], 'base64'));
});

export default router;
