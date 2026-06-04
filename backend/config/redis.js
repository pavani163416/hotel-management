import { createClient } from "redis";
import logger from "../utils/logger.js";

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_URI || process.env.REDISCLOUD_URL || "";
const REDIS_TLS = process.env.REDIS_TLS === "true";

let redisClient = null;
let redisReady = false;

const reconnectStrategy = (retries) => {
  if (retries > 10) return new Error("Redis reconnect retries exhausted");
  return Math.min(retries * 100, 3000);
};

export const initializeRedis = async () => {
  if (redisClient) return { client: redisClient, enabled: redisReady };

  if (!REDIS_URL) {
    logger.warn("Redis is disabled because REDIS_URL is not configured.");
    return { client: null, enabled: false };
  }

  redisClient = createClient({
    url: REDIS_URL,
    socket: {
      tls: REDIS_TLS ? { rejectUnauthorized: false } : undefined,
      reconnectStrategy,
    },
    disableOfflineQueue: true, // Prevent command queueing (hangs) when Redis is offline or reconnecting
  });

  redisClient.on("error", (error) => {
    redisReady = false;
    logger.error("Redis client error", { error: error?.message || error });
  });

  redisClient.on("connect", () => {
    logger.info("Redis client connecting...");
  });

  redisClient.on("ready", () => {
    redisReady = true;
    logger.info("Redis connection ready");
  });

  redisClient.on("end", () => {
    redisReady = false;
    logger.warn("Redis connection closed");
  });

  try {
    await redisClient.connect();
  } catch (error) {
    logger.error("Unable to connect to Redis", { error: error?.message || error });
    redisClient = null;
    redisReady = false;
  }

  return { client: redisClient, enabled: redisReady };
};

export const getRedisClient = () => redisClient;
export const isRedisReady = () => redisReady;

export const createRedisAdapterClients = async () => {
  if (!redisReady || !redisClient) return { pubClient: null, subClient: null };

  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();

  // Prevent fatal uncaught exceptions if adapter clients lose connection
  pubClient.on("error", (error) => {
    logger.error("Redis pubClient error", { error: error?.message || error });
  });
  subClient.on("error", (error) => {
    logger.error("Redis subClient error", { error: error?.message || error });
  });

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    return { pubClient, subClient };
  } catch (error) {
    logger.error("Failed to connect Redis adapter clients", { error: error?.message || error });
    return { pubClient: null, subClient: null };
  }
};

export const disconnectRedis = async () => {
  if (!redisClient) return;
  try {
    await redisClient.quit();
  } catch (error) {
    logger.warn("Error while shutting down Redis", { error: error?.message || error });
  }
  redisClient = null;
  redisReady = false;
};
