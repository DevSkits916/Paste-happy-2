import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@paste-happy-pro/db';

const router = Router();

const assistLogSchema = z.object({
  groupUrl: z.string().url(),
  message: z.string().min(1)
});

function createSnippet(message: string) {
  return message.replace(/\s+/g, ' ').trim().slice(0, 160);
}

router.post('/log', async (req, res, next) => {
  try {
    const data = assistLogSchema.parse(req.body);
    const snippet = createSnippet(data.message);

    await prisma.postLog.create({
      data: {
        userId: req.userId!,
        kind: 'group_assist',
        target: data.groupUrl,
        message: snippet,
        status: 'ok',
        meta: {
          groupUrl: data.groupUrl,
          snippetOfMessage: snippet
        }
      }
    });

    res.status(201).json({ snippet });
  } catch (error) {
    next(error);
  }
});

export const assistRouter = router;
