import mongoose from "mongoose";
import dns      from "dns";
import logger   from "../utils/logger.js";

// Force IPv4 — fixes querySrv ECONNREFUSED on Windows/some Linux
dns.setDefaultResultOrder("ipv4first");

// Apply custom DNS servers only in local/development environments to bypass ISP-level DNS SRV blocks.
// We avoid doing this on Railway because it breaks Railway's internal Redis hostname resolution.
if (process.env.NODE_ENV !== "production" || !process.env.RAILWAY_ENVIRONMENT_NAME) {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
  } catch (err) {
    logger.warn("Failed to set local DNS resolver fallback", { error: err?.message });
  }
}

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // ms

const connectDB = async (attempt = 1) => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS:          45000,
      family:                   4,
    });

    logger.info(`MongoDB (athithigriha) connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB connection failed (attempt ${attempt}/${MAX_RETRIES})`, {
      error: error.message,
    });

    if (attempt < MAX_RETRIES) {
      logger.info(`Retrying in ${RETRY_DELAY / 1000}s...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      return connectDB(attempt + 1);
    }

    logger.error("Max retries reached. Exiting.");
    process.exit(1);
  }
};

export default connectDB;
