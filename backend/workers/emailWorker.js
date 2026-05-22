import IORedis from "ioredis";
import { Worker } from "bullmq";
import { sendBookingConfirmation, sendCancellationEmail, sendPasswordResetEmail } from "../utils/emailService.js";
import logger from "../utils/logger.js";

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_URI || process.env.REDISCLOUD_URL || "";
const REDIS_TLS = process.env.REDIS_TLS === "true";

if (!REDIS_URL) {
  logger.warn("Email worker did not start: REDIS_URL is not configured.");
  process.exit(0);
}

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  tls: REDIS_TLS ? { rejectUnauthorized: false } : undefined,
});

const worker = new Worker(
  "luxeEmailQueue",
  async (job) => {
    const { name, data } = job;

    switch (name) {
      case "bookingConfirmation":
        return sendBookingConfirmation(data);
      case "cancellationEmail":
        return sendCancellationEmail(data);
      case "passwordReset":
        return sendPasswordResetEmail(data);
      default:
        throw new Error(`Unknown email job type: ${name}`);
    }
  },
  {
    connection,
    concurrency: 5,
    lockDuration: 60000,
  }
);

worker.on("completed", (job) => {
  logger.info("Email job completed", { jobId: job.id, name: job.name });
});

worker.on("failed", (job, err) => {
  logger.error("Email job failed", { jobId: job?.id, name: job?.name, error: err?.message || err });
});

worker.on("error", (err) => {
  logger.error("Email worker error", { error: err?.message || err });
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});

export default worker;
