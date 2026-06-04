/**
 * adminDb.js — Separate MongoDB connection for the controller/admin database.
 * Keeps admin data completely separate from user-facing luxestay data.
 */
import mongoose from "mongoose";
import dns      from "dns";
import logger   from "../utils/logger.js";

dns.setDefaultResultOrder("ipv4first");

let adminConn = null;
let adminConnPromise = null;
let lastFailedTime = 0;
const RECONNECT_COOLDOWN_MS = 60000; // 1 minute cooldown if connection fails

export const connectAdminDB = async (attempt = 1) => {
  if (adminConn) return adminConn;

  // Re-use active connection attempt promise
  if (adminConnPromise) {
    return adminConnPromise;
  }

  // Check cooldown if last attempt failed
  const now = Date.now();
  if (now - lastFailedTime < RECONNECT_COOLDOWN_MS) {
    logger.warn("connectAdminDB: Skipping connection attempt due to cooldown (Admin DB offline/unreachable)");
    return null;
  }

  const uri = process.env.MONGO_ADMIN_URI;
  if (!uri) {
    logger.error("MONGO_ADMIN_URI not set in environment variables");
    throw new Error("MONGO_ADMIN_URI not set");
  }

  adminConnPromise = (async () => {
    const MAX_RETRIES = 2;
    const RETRY_DELAY = 1000;

    for (let tryNum = attempt; tryNum <= MAX_RETRIES; tryNum++) {
      try {
        const conn = await mongoose.createConnection(uri, {
          serverSelectionTimeoutMS: 5000, // Reduced from 15000 to fail faster
          socketTimeoutMS:          45000,
          family:                   4,
        });

        conn.on("connected", () =>
          logger.info(`MongoDB (controller) connected: ${conn.host}`)
        );
        conn.on("error", (err) =>
          logger.error("MongoDB (controller) error", { error: err.message })
        );
        conn.on("disconnected", () => {
          logger.warn("MongoDB (controller) disconnected");
          adminConn = null;
        });

        adminConn = conn;
        adminConnPromise = null;
        return conn;
      } catch (error) {
        logger.error(`Admin DB connection failed (attempt ${tryNum}/${MAX_RETRIES})`, {
          error: error.message,
        });

        if (tryNum < MAX_RETRIES) {
          logger.info(`Retrying admin DB in ${RETRY_DELAY / 1000}s...`);
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
        }
      }
    }

    logger.error("Admin DB max retries reached. Continuing without admin DB.");
    lastFailedTime = Date.now();
    adminConnPromise = null;
    adminConn = null;
    return null;
  })();

  return adminConnPromise;
};

export default connectAdminDB;
