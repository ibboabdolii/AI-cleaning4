import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient>;

export async function initRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redisClient = createClient({
    url: redisUrl,
  });
  
  redisClient.on('error', (err) => console.error('Redis error:', err));
  
  await redisClient.connect();
  console.log('Connected to Redis');
}

export function getRedisClient() {
  return redisClient;
}