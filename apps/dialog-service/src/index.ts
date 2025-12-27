import express from 'express';
import dotenv from 'dotenv';
import dialogRouter from './routes/dialog';
import { initRedis } from './session/redis-client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use('/', dialogRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  await initRedis();
  app.listen(PORT, () => {
    console.log(`Dialog service listening on port ${PORT}`);
  });
}

start();