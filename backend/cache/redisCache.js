import logger from "../utils/logger.js";
import { getRedisClient, isRedisReady } from "../config/redis.js";

const localCache = new Map();

const scheduleLocalExpiry = (key, ttl) => {
  setTimeout(() => {
    localCache.delete(key);
  }, ttl * 1000).unref();
};

export const cacheGet = async (key) => {
  if (!key) return null;
  if (!isRedisReady()) {
    const entry = localCache.get(key);
    return entry ?? null;
  }

  try {
    const client = getRedisClient();
    if (!client) return null;
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.warn("Redis cache GET failed", { key, error: error?.message || error });
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds = 300) => {
  if (!key) return;
  const payload = JSON.stringify(value);

  if (!isRedisReady()) {
    localCache.set(key, value);
    scheduleLocalExpiry(key, ttlSeconds);
    return;
  }

  try {
    const client = getRedisClient();
    if (!client) return;
    await client.set(key, payload, { EX: ttlSeconds });
  } catch (error) {
    logger.warn("Redis cache SET failed", { key, error: error?.message || error });
  }
};

export const cacheDel = async (key) => {
  if (!key) return;

  if (!isRedisReady()) {
    if (key.includes("*")) {
      const matcher = new RegExp(`^${key.replace(/\*/g, ".*")}$`);
      for (const existingKey of Array.from(localCache.keys())) {
        if (matcher.test(existingKey)) {
          localCache.delete(existingKey);
        }
      }
      return;
    }
    localCache.delete(key);
    return;
  }

  try {
    const client = getRedisClient();
    if (!client) return;

    if (key.includes("*")) {
      let cursor = 0;
      do {
        const [nextCursor, keys] = await client.scan(cursor, { MATCH: key, COUNT: 100 });
        if (keys.length) {
          await client.unlink(...keys);
        }
        cursor = Number(nextCursor);
      } while (cursor !== 0);
    } else {
      await client.del(key);
    }
  } catch (error) {
    logger.warn("Redis cache DELETE failed", { key, error: error?.message || error });
  }
};

export const buildCacheKey = (...parts) => parts
  .filter((part) => part !== undefined && part !== null && String(part).trim() !== "")
  .map((part) => String(part).trim().toLowerCase())
  .join(":");
