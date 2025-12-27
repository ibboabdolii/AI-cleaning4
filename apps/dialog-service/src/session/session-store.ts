import type { Session } from '@cleanai/shared';
import { getRedisClient } from './redis-client';

const SESSION_TTL = 86400; // 24 hours

export async function getSession(sessionId: string): Promise<Session | null> {
  const redis = getRedisClient();
  const key = `session:${sessionId}`;
  
  const data = await redis.get(key);
  if (!data) return null;
  
  return JSON.parse(data) as Session;
}

export async function updateSession(session: Session): Promise<void> {
  const redis = getRedisClient();
  const key = `session:${session.session_id}`;
  
  await redis.setEx(key, SESSION_TTL, JSON.stringify(session));
}

export async function deleteSession(sessionId: string): Promise<void> {
  const redis = getRedisClient();
  const key = `session:${sessionId}`;
  
  await redis.del(key);
}