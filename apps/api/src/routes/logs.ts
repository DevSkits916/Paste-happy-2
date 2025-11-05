import { Router } from 'express';
import { prisma } from '@paste-happy-pro/db';
import { z } from 'zod';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const query = z
      .object({
        limit: z.coerce.number().int().positive().max(100).optional()
      })
      .parse(req.query);

    const logs = await prisma.postLog.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50
    });

    res.json(logs);
  } catch (error) {
    next(error);
  }
});

export const logsRouter = router;
