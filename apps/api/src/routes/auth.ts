import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '@paste-happy-pro/db';
import { env } from '../env.js';

const router = Router();

const devLoginSchema = z.object({
  email: z.string().email(),
  name: z.string().optional()
});

router.post('/dev-login', async (req, res, next) => {
  try {
    const body = devLoginSchema.parse(req.body);
    const user = await prisma.user.upsert({
      where: { email: body.email },
      update: { name: body.name ?? undefined },
      create: {
        email: body.email,
        name: body.name
      }
    });

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

export const authRouter = router;
