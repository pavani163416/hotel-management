import logger from "../utils/logger.js";
import { getRedisClient, isRedisReady } from "../config/redis.js";

const LOCK_PREFIX = "luxe:lock:room:";

const buildLockKey = (hotelStringId, roomIdentifier) => {
  const hotelKey = hotelStringId ? String(hotelStringId).trim().toLowerCase() : "global";
  const roomKey = roomIdentifier ? String(roomIdentifier).trim().toLowerCase() : "default";
  return `${LOCK_PREFIX}${hotelKey}:${roomKey}`;
};

export const acquireRoomLock = async ({ hotelStringId, roomIdentifier, ttlSeconds = 30 }) => {
  if (!isRedisReady()) {
    return { acquired: true, lockKey: null };
  }

  try {
    const client = getRedisClient();
    if (!client) return { acquired: true, lockKey: null };

    const lockKey = buildLockKey(hotelStringId, roomIdentifier);
    const result = await client.set(lockKey, "locked", { NX: true, EX: ttlSeconds });
    return { acquired: Boolean(result), lockKey };
  } catch (error) {
    logger.warn("Failed to acquire room lock", { hotelStringId, roomIdentifier, error: error?.message || error });
    return { acquired: true, lockKey: null };
  }
};

export const releaseRoomLock = async (lockKey) => {
  if (!lockKey || !isRedisReady()) return;

  try {
    const client = getRedisClient();
    if (!client) return;
    await client.del(lockKey);
  } catch (error) {
    logger.warn("Failed to release room lock", { lockKey, error: error?.message || error });
  }
};
