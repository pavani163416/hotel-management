/**
 * seedAdminUser.mjs
 * Creates the Super Admin record in the controller DB (adminusers collection).
 * Run once: node backend/scripts/seedAdminUser.mjs
 */
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dns from "dns";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const schema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role:     { type: String, default: "Super Admin" },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
}, { timestamps: true, collection: "adminusers" });

const AdminUser = mongoose.model("AdminUser", schema);

const ADMIN = {
  name:     process.env.ADMIN_NAME     || "Super Admin",
  email:    process.env.ADMIN_EMAIL    || "admin@luxestay.com",
  password: process.env.ADMIN_PASSWORD || "admin123",
  role:     "Super Admin",
};

const run = async () => {
  // Connect to the CONTROLLER database
  const uri = process.env.MONGO_ADMIN_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  console.log("✅  Connected to controller DB\n");

  const hashed = await bcrypt.hash(ADMIN.password, 12);

  const existing = await AdminUser.findOne({ email: ADMIN.email });
  if (existing) {
    await AdminUser.findOneAndUpdate(
      { email: ADMIN.email },
      { name: ADMIN.name, password: hashed, role: ADMIN.role, isActive: true }
    );
    console.log("↻  Admin user updated:", ADMIN.email);
  } else {
    await AdminUser.create({ ...ADMIN, password: hashed });
    console.log("✅  Admin user created:", ADMIN.email);
  }

  console.log("\n─────────────────────────────────────────");
  console.log("  Email   :", ADMIN.email);
  console.log("  Password:", ADMIN.password, "(now hashed in DB)");
  console.log("─────────────────────────────────────────\n");
  console.log("You can now remove ADMIN_EMAIL and ADMIN_PASSWORD from .env");

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((e) => { console.error("❌", e.message); process.exit(1); });
