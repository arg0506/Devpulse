import { Router, Response } from 'express';
import { db } from '../db';
import prisma, { isPrismaEnabled } from '../prismaClient';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET all communities
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!isPrismaEnabled()) {
    return res.json(db.getCommunities());
  }
  try {
    // Attempt Prisma fetch
    const prismaCommunities = await prisma.community.findMany({
      include: {
        members: {
          select: { userId: true }
        },
        channels: {
          select: { id: true, name: true }
        }
      }
    });

    const formatted = prismaCommunities.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description || '',
      channels: c.channels.map(chan => chan.id),
      members: c.members.map(m => m.userId)
    }));

    return res.json(formatted);
  } catch (error) {
    console.warn('[Prisma Warning] Failed to get communities from SQL DB, falling back to JSON storage:', error);
    return res.json(db.getCommunities());
  }
});

// POST create community
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const creatorId = req.user?.userId || 'unknown';

    if (!isPrismaEnabled()) {
      const jsonComm = db.createCommunity(name, description || '', creatorId);
      return res.status(201).json(jsonComm);
    }

    try {
      // Create community in Prisma
      const newComm = await prisma.community.create({
        data: {
          name,
          description: description || '',
          ownerId: creatorId,
          members: {
            create: {
              userId: creatorId,
              role: 'ADMIN'
            }
          },
          channels: {
            create: {
              name: `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-general`
            }
          }
        },
        include: {
          channels: true,
          members: true
        }
      });

      const formatted = {
        id: newComm.id,
        name: newComm.name,
        description: newComm.description || '',
        channels: newComm.channels.map(chan => chan.id),
        members: newComm.members.map(m => m.userId)
      };

      // Keep JSON storage synchronized
      db.createCommunity(name, description || '', creatorId);

      return res.status(201).json(formatted);
    } catch (dbErr) {
      console.warn('[Prisma Warning] Failed to create community in SQL DB, writing to JSON storage:', dbErr);
      const jsonComm = db.createCommunity(name, description || '', creatorId);
      return res.status(201).json(jsonComm);
    }
  } catch (error: any) {
    console.error('Create Community error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST join community
router.post('/:id/join', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || 'unknown';

    if (!isPrismaEnabled()) {
      db.joinCommunity(id, userId);
      return res.json({ message: 'Joined community successfully' });
    }

    try {
      // Join in Prisma SQL DB
      const existingMember = await prisma.communityMember.findFirst({
        where: {
          communityId: id,
          userId
        }
      });

      if (!existingMember) {
        await prisma.communityMember.create({
          data: {
            communityId: id,
            userId,
            role: 'MEMBER'
          }
        });
      }

      // Sync with JSON DB
      db.joinCommunity(id, userId);

      return res.json({ message: 'Joined community successfully' });
    } catch (dbErr) {
      console.warn('[Prisma Warning] Failed to join community in SQL DB, using JSON storage:', dbErr);
      db.joinCommunity(id, userId);
      return res.json({ message: 'Joined community successfully (local backup)' });
    }
  } catch (error: any) {
    console.error('Join Community error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
