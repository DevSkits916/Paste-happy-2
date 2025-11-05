import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export type {
  User,
  PageConnection,
  QueueRow,
  Template,
  PostLog
} from '@prisma/client';
