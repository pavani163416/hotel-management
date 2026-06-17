import "dotenv/config";
import mongoose from "mongoose";
import { createClient } from "redis";
import { v2 as cloudinary } from "cloudinary";

async function runDiagnostics() {
  console.log("=========================================");
  console.log("       ATHITHIGRIHA SYSTEM DIAGNOSTICS      ");
  console.log("=========================================\n");

  // 1. MongoDB Connection Check
  console.log("1. Checking MongoDB...");
  if (!process.env.MONGO_URI) {
    console.log("❌ MongoDB URI (MONGO_URI) is not configured in .env");
  } else {
    try {
      console.log(" - Trying standard MONGO_URI...");
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      console.log("✅ MongoDB Connected Successfully via standard MONGO_URI!");
      
      const db = mongoose.connection.db;
      const collections = await db.listCollections().toArray();
      console.log("Collections & Document Counts:");
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(` - ${col.name}: ${count} document(s)`);
      }
      await mongoose.connection.close();
    } catch (err) {
      console.log("⚠️ Standard connection failed:", err.message);
      console.log(" - Trying direct shard fallback connection...");
      try {
        const fallbackUri = "mongodb://addepallipavani4_db_user:fwcMA4LWNzPVYuRR@ac-yfgxigg-shard-00-00.qehr8hm.mongodb.net:27017,ac-yfgxigg-shard-00-01.qehr8hm.mongodb.net:27017,ac-yfgxigg-shard-00-02.qehr8hm.mongodb.net:27017/athithigriha?ssl=true&replicaSet=atlas-7t7uoi-shard-0&authSource=admin&retryWrites=true&w=majority";
        await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 5000 });
        console.log("✅ MongoDB Connected Successfully via direct shard connection!");
        
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log("Collections & Document Counts:");
        for (const col of collections) {
          const count = await db.collection(col.name).countDocuments();
          console.log(` - ${col.name}: ${count} document(s)`);
        }
        await mongoose.connection.close();
      } catch (fallbackErr) {
        console.log("❌ MongoDB Fallback Connection FAILED:", fallbackErr.message);
      }
    }
  }
  console.log("\n-----------------------------------------\n");

  // 2. Redis Connection Check
  console.log("2. Checking Redis...");
  const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_URI || process.env.REDISCLOUD_URL || "";
  const REDIS_TLS = process.env.REDIS_TLS === "true";
  
  if (!REDIS_URL) {
    console.log("⚠️ Redis is not configured (missing REDIS_URL/REDIS_URI/REDISCLOUD_URL). Skipping.");
  } else {
    try {
      const redisClient = createClient({
        url: REDIS_URL,
        socket: {
          tls: REDIS_TLS ? { rejectUnauthorized: false } : undefined,
        },
      });
      redisClient.on("error", (err) => {
        // Suppress unhandled exceptions
      });
      await redisClient.connect();
      console.log("✅ Redis Connected Successfully!");
      const pingRes = await redisClient.ping();
      console.log(` - PING response: ${pingRes}`);
      
      await redisClient.set("luxe_diag_test", "OK");
      const getRes = await redisClient.get("luxe_diag_test");
      console.log(` - Test Set/Get key luxe_diag_test: ${getRes === "OK" ? "SUCCESS" : "FAILED"}`);
      await redisClient.del("luxe_diag_test");
      
      await redisClient.quit();
    } catch (err) {
      console.log("❌ Redis Connection FAILED:", err.message);
    }
  }
  console.log("\n-----------------------------------------\n");

  // 3. Cloudinary Check
  console.log("3. Checking Cloudinary...");
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.log("❌ Cloudinary credentials (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET) are incomplete in .env");
  } else {
    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:    process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      const pingResult = await cloudinary.api.ping();
      console.log("✅ Cloudinary Ping successful! Connection state:", pingResult.status === "ok" ? "SUCCESS" : "FAILED");
    } catch (err) {
      console.log("❌ Cloudinary Connection/Authentication FAILED:", err.message);
    }
  }
  console.log("\n=========================================");
}

runDiagnostics();
