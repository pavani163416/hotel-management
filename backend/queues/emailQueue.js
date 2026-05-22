import IORedis from "ioredis";
import { Queue, QueueScheduler } from "bullmq";
import logger from "../utils/logger.js";

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_URI || process.env.REDISCLOUD_URL || "";
const REDIS_TLS = process.env.REDIS_TLS === "true";

let queue = null;
let queueScheduler = null;
let connection = null;
let queueEnabled = false;

if (REDIS_URL) {
  connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    tls: REDIS_TLS ? { rejectUnauthorized: false } : undefined,
  });

  connection.on("ready", () => {
    queueEnabled = true;
    logger.info("BullMQ connection ready");
  });
  connection.on("error", (error) => {
    queueEnabled = false;
    logger.error("BullMQ connection error", { error: error?.message || error });
  });

  queue = new Queue("luxeEmailQueue", {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  queueScheduler = new QueueScheduler("luxeEmailQueue", { connection });
}

export const isEmailQueueEnabled = () => queueEnabled && Boolean(queue);

export const enqueueEmailJob = async (name, data = {}) => {
  if (!queue) {
    logger.warn("Email queue is unavailable; job will not be queued", { name });
    return null;
  }

  try {
    return await queue.add(name, data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
  } catch (error) {
    logger.warn("Failed to enqueue email job", { name, error: error?.message || error });
    return null;
  }
};

export default queue;
