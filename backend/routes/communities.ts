import { Router, Response } from 'express';
import { db } from '../db';
import prisma, { isPrismaEnabled } from '../prismaClient';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getIO } from '../realtime';

const router = Router();

/** Best-effort copy into Postgres. The JSON store stays the source of truth for the live workspace. */
function mirror(task: () => Promise<unknown>) {
  if (!isPrismaEnabled()) return;
  task().catch((err) => console.warn('[communities] Postgres mirror failed:', err.message));
}

router.get('/', (_req, res) => {
  res.json(db.getCommunities());
});

router.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  if (name.length < 3) return res.status(400).json({ error: 'Community names need at least 3 characters.' });

  const userId = req.user!.userId;
  const community = db.createCommunity(name.slice(0, 40), description.slice(0, 200), userId);
  const io = getIO();
  io?.emit('community:new', community);
  community.channels.forEach((id) => {
    const chan = db.getChannel(id);
    if (chan) io?.emit('channel:new', chan);
  });

  mirror(async () => {
    await prisma.community.upsert({
      where: { id: community.id },
      update: {},
      create: {
        id: community.id,
        name: community.name,
        description: community.description,
        ownerId: userId,
        members: { create: { userId, role: 'ADMIN' } },
      },
    });
  });

  return res.status(201).json(community);
});

/** Join, or leave when already a member. */
router.post('/:id/join', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const community = db.toggleCommunityMembership(req.params.id, userId);
  if (!community) return res.status(404).json({ error: 'That community no longer exists.' });
  getIO()?.emit('community:update', community);

  const joined = community.members.includes(userId);
  mirror(async () => {
    if (joined) {
      await prisma.communityMember.upsert({
        where: { userId_communityId: { userId, communityId: community.id } },
        update: {},
        create: { userId, communityId: community.id },
      });
    } else {
      await prisma.communityMember.deleteMany({ where: { userId, communityId: community.id } });
    }
  });

  return res.json(community);
});

export default router;
