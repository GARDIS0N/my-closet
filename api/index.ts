import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { closetAiRouter } from '../server/closetAiRouter.js';

dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) =>
  res.json({ status: 'ok', app: 'MyCloset API', time: new Date().toISOString() })
);
app.get('/api/health', (_req: Request, res: Response) =>
  res.json({ status: 'ok', app: 'MyCloset API', time: new Date().toISOString() })
);

// Mount MyCloset AI Stylist endpoints
app.use('/api/closet', closetAiRouter);

export default app;
