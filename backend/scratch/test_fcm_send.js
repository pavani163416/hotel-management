import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import admin from "firebase-admin";
import User from "../models/User.js";

let initialised = false;
function initFirebase() {
  if (initialised || admin.apps.length > 0) return;
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  initialised = true;
}

async function run() {
  initFirebase();
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const users = await User.find({ fcmToken: { $ne: null } });
  console.log(`Found ${users.length} users with FCM tokens in DB.`);

  for (const u of users) {
    console.log(`Sending to: ${u.email} | Token: ${u.fcmToken.substring(0, 30)}...`);
    try {
      const message = {
        notification: { title: "Test Admin Push", body: "Hello from admin console" },
        data: {
          type: "system",
          notificationId: "test_id",
          role: "customer"
        },
        android: {
          notification: {
            channelId: "high_importance_channel",
            priority: "high",
            sound: "notification",
          },
          priority: "high",
        },
        apns: {
          payload: { aps: { sound: "default", badge: 1 } },
        },
        token: u.fcmToken
      };

      const response = await admin.messaging().send(message);
      console.log(`  ✅ Success! Message ID: ${response}`);
    } catch (err) {
      console.log(`  ❌ Failed: ${err.message} (Code: ${err.code})`);
    }
  }

  await mongoose.connection.close();
}

run().catch(console.error);
