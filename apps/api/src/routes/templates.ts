import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@paste-happy-pro/db';

const router = Router();

const templateSchema = z.object({
  name: z.string().min(1),
  body: z.string().min(1)
});

router.get('/', async (req, res, next) => {
  try {
    const templates = await prisma.template.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(templates);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = templateSchema.parse(req.body);
    const created = await prisma.template.create({
      data: { ...data, userId: req.userId! }
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().cuid() }).parse(req.params);
    const data = templateSchema
      .partial()
      .refine((val) => Object.keys(val).length > 0, {
        message: 'No fields to update'
      })
      .parse(req.body);
    const existing = await prisma.template.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) {
      return res.status(404).json({ message: 'Template not found' });
    }
    const updated = await prisma.template.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().cuid() }).parse(req.params);
    const existing = await prisma.template.findFirst({ where: { id, userId: req.userId! } });
    if (!existing) {
      return res.status(404).json({ message: 'Template not found' });
    }
    await prisma.template.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const templatesRouter = router;
