import { Router, Response } from 'express';
import { db } from '../db';
import prisma, { isPrismaEnabled } from '../prismaClient';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getIO } from '../realtime';

const router = Router();

function mirror(task: () => Promise<unknown>) {
  if (!isPrismaEnabled()) return;
  task().catch((err) => console.warn('[events] Postgres mirror failed:', err.message));
}

router.get('/', (_req, res) => {
  res.json(db.getEvents());
});

router.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { title, description, date, meetLink, communityId } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Give the event a title.' });
  const parsed = Date.parse(date);
  if (Number.isNaN(parsed)) return res.status(400).json({ error: 'Pick a date and time for the event.' });
  if (meetLink && !/^https?:\/\//i.test(meetLink)) {
    return res.status(400).json({ error: 'Meeting links must start with http:// or https://.' });
  }

  const event = db.createEvent({
    title: String(title).trim().slice(0, 80),
    description: String(description || '')
      .trim()
      .slice(0, 500),
    date: new Date(parsed).toISOString(),
    meetLink: String(meetLink || '').trim(),
    creator: req.user!.username,
    communityId: communityId || 'comm-global',
  });
  getIO()?.emit('event:new', event);

  const userId = req.user!.userId;
  mirror(() =>
    prisma.event.create({
      data: {
        id: event.id,
        title: event.title,
        description: event.description,
        date: new Date(event.date),
        meetLink: event.meetLink,
        creatorId: userId,
        rsvps: { create: { userId } },
      },
    }),
  );

  return res.status(201).json(event);
});

router.post('/:id/rsvp', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const event = db.toggleRSVP(req.params.id, req.user!.username);
  if (!event) return res.status(404).json({ error: 'That event no longer exists.' });
  getIO()?.emit('event:rsvp-update', { eventId: event.id, rsvps: event.rsvps });

  const userId = req.user!.userId;
  const going = event.rsvps.includes(req.user!.username);
  mirror(async () => {
    if (going) {
      await prisma.eventRSVP.upsert({
        where: { userId_eventId: { userId, eventId: event.id } },
        update: {},
        create: { userId, eventId: event.id },
      });
    } else {
      await prisma.eventRSVP.deleteMany({ where: { userId, eventId: event.id } });
    }
  });

  return res.json(event);
});

export default router;
