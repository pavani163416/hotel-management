import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;

  // Inspect and drop phone index in users collection
  try {
    const userIndexes = await db.collection("users").indexes();
    console.log("Users indexes:", userIndexes);
    for (const idx of userIndexes) {
      if (idx.key.phone && idx.unique) {
        console.log("Dropping unique phone index from users collection:", idx.name);
        await db.collection("users").dropIndex(idx.name);
        console.log("Dropped!");
      }
    }
  } catch (err) {
    console.error("Error inspecting/dropping users phone index:", err.message);
  }

  // Inspect and drop phone index in guests collection
  try {
    const guestIndexes = await db.collection("guests").indexes();
    console.log("Guests indexes:", guestIndexes);
    for (const idx of guestIndexes) {
      if (idx.key.phone && idx.unique) {
        console.log("Dropping unique phone index from guests collection:", idx.name);
        await db.collection("guests").dropIndex(idx.name);
        console.log("Dropped!");
      }
    }
  } catch (err) {
    console.error("Error inspecting/dropping guests phone index:", err.message);
  }

  await mongoose.connection.close();
}

run().catch(console.error);
