/**
 * clearRedisCache.js
 * Connects to the cloud Redis database and flushes it, invalidating all cache keys.
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import { createClient } from "redis";

const run = async () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error("❌ REDIS_URL not found in environment variables.");
    process.exit(1);
  }

  console.log(`Connecting to Redis: ${redisUrl}`);
  const client = createClient({ url: redisUrl });

  client.on("error", (err) => console.error("Redis Client Error", err));

  await client.connect();
  console.log("Connected successfully to cloud Redis.");

  // Flush Redis database
  const reply = await client.flushAll();
  console.log(`🧹 Redis cache flushed: ${reply}`);

  await client.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ Failed to flush Redis:", err);
  process.exit(1);
});
