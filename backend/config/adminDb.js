/**
 * adminDb.js — Separate MongoDB connection for the controller/admin database.
 * Keeps admin data completely separate from user-facing luxestay data.
 */
import mongoose from "mongoose";
import dns      from "dns";
import logger   from "../utils/logger.js";

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

let adminConn = null;

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

export const connectAdminDB = async (attempt = 1) => {
  if (adminConn) return adminConn;

  const uri = process.env.MONGO_ADMIN_URI;
  if (!uri) {
    logger.error("MONGO_ADMIN_URI not set in environment variables");
    throw new Error("MONGO_ADMIN_URI not set");
  }

  try {
    adminConn = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS:          45000,
      family:                   4,
    });

    adminConn.on("connected", () =>
      logger.info(`MongoDB (controller) connected: ${adminConn.host}`)
    );
    adminConn.on("error", (err) =>
      logger.error("MongoDB (controller) error", { error: err.message })
    );
    adminConn.on("disconnected", () =>
      logger.warn("MongoDB (controller) disconnected")
    );

    return adminConn;
  } catch (error) {
    logger.error(`Admin DB connection failed (attempt ${attempt}/${MAX_RETRIES})`, {
      error: error.message,
    });

    if (attempt < MAX_RETRIES) {
      logger.info(`Retrying admin DB in ${RETRY_DELAY / 1000}s...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      adminConn = null;
      return connectAdminDB(attempt + 1);
    }

    logger.error("Admin DB max retries reached. Continuing without admin DB.");
    // Don't exit — admin DB failure shouldn't kill the whole server
  }
};

export default connectAdminDB;
