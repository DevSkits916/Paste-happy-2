import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@paste-happy-pro/db';

const router = Router();

const queueItemSchema = z.object({
  groupName: z.string().min(1),
  groupUrl: z.string().url(),
  adText: z.string().min(1),
  status: z.enum(['queued', 'done', 'skipped']).optional(),
  attempts: z.number().int().nonnegative().optional(),
  lastPostedAt: z.string().datetime().optional().nullable(),
  notes: z.string().optional()
});

router.get('/', async (req, res, next) => {
  try {
    const items = await prisma.queueRow.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = queueItemSchema.parse(req.body);
    const created = await prisma.queueRow.create({
      data: {
        ...data,
        lastPostedAt:
          data.lastPostedAt === null
            ? null
            : data.lastPostedAt
            ? new Date(data.lastPostedAt)
            : undefined,
        userId: req.userId!
      }
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

const queueUpdateSchema = queueItemSchema.partial();

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().cuid() }).parse(req.params);
    const data = queueUpdateSchema.parse(req.body);
    const existing = await prisma.queueRow.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) {
      return res.status(404).json({ message: 'Queue item not found' });
    }
    const updated = await prisma.queueRow.update({
      where: { id },
      data: {
        ...data,
        lastPostedAt:
          data.lastPostedAt === null
            ? null
            : data.lastPostedAt
            ? new Date(data.lastPostedAt)
            : undefined
      }
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export const queueRouter = router;
