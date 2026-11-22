import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getIO } from '../realtime';

const router = Router();
router.use(authMiddleware);

/** Groups are open to everyone to find and join; `joined` tells the caller where they stand. */
function forUser(group: ReturnType<typeof db.getGroup> & object, userId: string) {
  return { ...group, joined: group.members.includes(userId), memberCount: group.members.length };
}

router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  res.json(db.listGroups().map((g) => forUser(g, userId)));
});

router.post('/', (req: AuthenticatedRequest, res: Response) => {
  const name = String(req.body?.name || '')
    .trim()
    .slice(0, 40);
  const description = String(req.body?.description || '')
    .trim()
    .slice(0, 200);
  if (name.length < 3) return res.status(400).json({ error: 'Group names need at least 3 characters.' });

  const userId = req.user!.userId;
  const { group, channel } = db.createGroup(name, description, userId);
  const io = getIO();
  io?.to(`user:${userId}`).emit('channel:new', channel);
  io?.emit('group:new', group);
  return res.status(201).json(forUser(group, userId));
});

/** Join, or leave when already a member. */
router.post('/:id/join', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const result = db.toggleGroupMembership(req.params.id, userId);
  if (!result) return res.status(404).json({ error: 'That group no longer exists.' });
  const { group, joined } = result;

  const io = getIO();
  if (joined) io?.to(`user:${userId}`).emit('channel:new', db.getChannel(group.channelId));
  else io?.to(`user:${userId}`).emit('channel:removed', { channelId: group.channelId });
  io?.emit('group:update', group);
  return res.json(forUser(group, userId));
});

export default router;
