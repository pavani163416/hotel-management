import cron from "node-cron";
import User from "../models/User.js";
import Guest from "../models/Guest.js";
import logger from "../utils/logger.js";

// Run every hour to check for accounts pending verification that are older than 24 hours
export const initCleanupJobs = () => {
  cron.schedule("0 * * * *", async () => {
    logger.info("Running scheduled cleanup for abandoned unverified accounts...");
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const abandonedUsers = await User.find({
        isVerified: false,
        createdAt: { $lt: twentyFourHoursAgo }
      });
      
      if (abandonedUsers.length === 0) {
        logger.info("No abandoned accounts found for cleanup.");
        return;
      }

      const guestIds = abandonedUsers.map(user => user.guestId).filter(id => id);
      const userIds = abandonedUsers.map(user => user._id);
      
      // Delete the linked Guest profiles
      if (guestIds.length > 0) {
        await Guest.deleteMany({ _id: { $in: guestIds } });
        logger.info(`Deleted ${guestIds.length} abandoned guest profiles.`);
      }

      // Delete the Users
      await User.deleteMany({ _id: { $in: userIds } });
      logger.info(`Deleted ${userIds.length} abandoned unverified user accounts.`);
    } catch (err) {
      logger.error("Error during scheduled cleanup of abandoned accounts", { error: err.message });
    }
  });

  logger.info("Account cleanup cron job initialized.");
};
