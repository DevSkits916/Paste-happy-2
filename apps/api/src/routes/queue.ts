import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@paste-happy-pro/db';

const router = Router();

const groupUrlSchema = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const parsed = new URL(value);
      if (!/^https?:$/.test(parsed.protocol)) {
        return false;
      }
      if (parsed.hostname.endsWith('facebook.com')) {
        return parsed.protocol === 'https:' && /\/groups\//.test(parsed.pathname);
      }
      return true;
    } catch (error) {
      return false;
    }
  }, 'Invalid group URL');

const queueItemSchema = z.object({
  groupName: z.string().trim().min(1),
  groupUrl: groupUrlSchema,
  adText: z.string().trim().min(20),
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

const queueImportSchema = z.object({
  rows: z
    .array(
      queueItemSchema.pick({ groupName: true, groupUrl: true, adText: true })
    )
    .min(1)
});

router.post('/import', async (req, res, next) => {
  try {
    const { rows } = queueImportSchema.parse(req.body);
    const normalizedRows = rows.map((row) => ({
      groupName: row.groupName.trim(),
      groupUrl: row.groupUrl.trim(),
      adText: row.adText.trim(),
      status: 'queued' as const,
      attempts: 0,
      userId: req.userId!
    }));

    const created = await prisma.$transaction(
      normalizedRows.map((row) =>
        prisma.queueRow.create({
          data: row
        })
      )
    );

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

export const queueRouter = router;
