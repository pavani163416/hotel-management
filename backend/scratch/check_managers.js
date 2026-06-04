import "dotenv/config";
import mongoose from "mongoose";
import dns from "dns";
import Manager from "../models/Manager.js";

dns.setDefaultResultOrder("ipv4first");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {}

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");
  
  const managers = await Manager.find({});
  console.log(`Found ${managers.length} managers:`);
  for (const m of managers) {
    console.log(`- Name: ${m.name}, Email: ${m.email}, Role: ${m.role}, PasswordHash: ${m.password}`);
  }
  
  process.exit(0);
}

check().catch(console.error);
