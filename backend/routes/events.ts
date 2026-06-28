import { Router, Response } from 'express';
import { db } from '../db';
import prisma, { isPrismaEnabled } from '../prismaClient';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET all technical events
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  if (!isPrismaEnabled()) {
    return res.json(db.getEvents());
  }
  try {
    // Attempt Prisma fetch
    const prismaEvents = await prisma.event.findMany({
      include: {
        rsvps: {
          include: {
            user: {
              select: { username: true }
            }
          }
        },
        creator: {
          select: { username: true }
        }
      }
    });

    const formatted = prismaEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description || '',
      date: e.date.toISOString(),
      meetLink: e.meetLink || '',
      creator: e.creator.username,
      communityId: e.communityId || 'comm-global',
      rsvps: e.rsvps.map(r => r.user.username)
    }));

    return res.json(formatted);
  } catch (error) {
    console.warn('[Prisma Warning] Failed to get events from SQL DB, falling back to JSON storage:', error);
    return res.json(db.getEvents());
  }
});

// POST create a technical event
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, date, meetLink, communityId } = req.body;
    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required' });
    }
    const userId = req.user?.userId || 'unknown';
    const username = req.user?.username || 'unknown';

    if (!isPrismaEnabled()) {
      const jsonEvt = db.createEvent(title, description || '', date, meetLink || '', username, communityId || 'comm-global');
      return res.status(201).json(jsonEvt);
    }

    try {
      const parsedDate = new Date(date);
      const newEvent = await prisma.event.create({
        data: {
          title,
          description: description || '',
          date: parsedDate,
          meetLink: meetLink || '',
          communityId: communityId || null,
          creatorId: userId,
          rsvps: {
            create: {
              userId
            }
          }
        },
        include: {
          creator: {
            select: { username: true }
          }
        }
      });

      const formatted = {
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description || '',
        date: newEvent.date.toISOString(),
        meetLink: newEvent.meetLink || '',
        creator: newEvent.creator.username,
        communityId: newEvent.communityId || 'comm-global',
        rsvps: [newEvent.creator.username]
      };

      // Sync to JSON DB
      db.createEvent(title, description || '', date, meetLink || '', username, communityId || 'comm-global');

      return res.status(201).json(formatted);
    } catch (dbErr) {
      console.warn('[Prisma Warning] Failed to create event in SQL DB, using JSON storage:', dbErr);
      const jsonEvt = db.createEvent(title, description || '', date, meetLink || '', username, communityId || 'comm-global');
      return res.status(201).json(jsonEvt);
    }
  } catch (error: any) {
    console.error('Create Event error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST toggle RSVP for an event
router.post('/:id/rsvp', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || 'unknown';
    const username = req.user?.username || 'unknown';

    if (!isPrismaEnabled()) {
      db.toggleRSVP(id, username);
      return res.json({ message: 'RSVP status updated successfully' });
    }

    try {
      // Toggle registration in Prisma SQL DB
      const existingRsvp = await prisma.eventRSVP.findUnique({
        where: {
          userId_eventId: {
            userId,
            eventId: id
          }
        }
      });

      if (existingRsvp) {
        await prisma.eventRSVP.delete({
          where: {
            userId_eventId: {
              userId,
              eventId: id
            }
          }
        });
      } else {
        await prisma.eventRSVP.create({
          data: {
            userId,
            eventId: id
          }
        });
      }

      // Sync to JSON DB
      db.toggleRSVP(id, username);

      return res.json({ message: 'RSVP status updated successfully' });
    } catch (dbErr) {
      console.warn('[Prisma Warning] Failed to update RSVP in SQL DB, using JSON storage:', dbErr);
      db.toggleRSVP(id, username);
      return res.json({ message: 'RSVP status updated successfully (local backup)' });
    }
  } catch (error: any) {
    console.error('Toggle RSVP error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
