import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { errorHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { queueRouter } from './routes/queue.js';
import { templatesRouter } from './routes/templates.js';
import { logsRouter } from './routes/logs.js';
import { requireAuth } from './middleware/auth.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/queue', requireAuth, queueRouter);
app.use('/templates', requireAuth, templatesRouter);
app.use('/logs', requireAuth, logsRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`);
});
