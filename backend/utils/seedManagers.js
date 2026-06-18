/**
 * seedManagers.js
 * ─────────────────────────────────────────────────────────
 * Seeds 7 hotel managers into the AdminUser collection.
 * Each manager is assigned to one of the 7 hotels.
 *
 * Run: cd backend && node utils/seedManagers.js
 *
 * Credentials format:
 *   Email:    <hotelcode>manager@swagruha.com
 *   Password: Manager@<HotelCode>2024
 *
 * Hotels:
 *   h1 → Hôtel de Lumière       (Paris)
 *   h2 → The Azure Skyline      (Tokyo)
 *   h3 → Coral Bay Resort       (Maldives)
 *   h4 → Alpine Peak Lodge      (Zermatt)
 *   h5 → The Grand Metropolitan (New York)
 *   h6 → Santorini Cliff Suites (Santorini)
 *   h7 → Swagruha Hotel         (Hyderabad) — flagship
 */

import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import Manager from "../models/Manager.js";

const MANAGERS = [
  {
    name:              "Lumière Manager",
    email:             "lumiere.manager@athithigriha.com",
    password:          "Manager@Lumiere2024",
    role:              "Manager",
    assignedHotelId:   "h1",
    assignedHotelName: "Hôtel de Lumière",
  },
  {
    name:              "Azure Manager",
    email:             "azure.manager@athithigriha.com",
    password:          "Manager@Azure2024",
    role:              "Manager",
    assignedHotelId:   "h2",
    assignedHotelName: "The Azure Skyline",
  },
  {
    name:              "Coral Bay Manager",
    email:             "coralbay.manager@athithigriha.com",
    password:          "Manager@CoralBay2024",
    role:              "Manager",
    assignedHotelId:   "h3",
    assignedHotelName: "Coral Bay Resort",
  },
  {
    name:              "Alpine Manager",
    email:             "alpine.manager@athithigriha.com",
    password:          "Manager@Alpine2024",
    role:              "Manager",
    assignedHotelId:   "h4",
    assignedHotelName: "Alpine Peak Lodge",
  },
  {
    name:              "Metropolitan Manager",
    email:             "metro.manager@athithigriha.com",
    password:          "Manager@Metro2024",
    role:              "Manager",
    assignedHotelId:   "h5",
    assignedHotelName: "The Grand Metropolitan",
  },
  {
    name:              "Santorini Manager",
    email:             "santorini.manager@athithigriha.com",
    password:          "Manager@Santorini2024",
    role:              "Manager",
    assignedHotelId:   "h6",
    assignedHotelName: "Santorini Cliff Suites",
  },
  {
    name:              "Swagruha Manager",
    email:             "swagruhamanager@gmail.com",
    password:          "Manager@Swagruha2024",
    role:              "Manager",
    assignedHotelId:   "h7",
    assignedHotelName: "Swagruha Hotel",
  },
];

const seed = async () => {
  await connectDB();
  console.log("🌱  Seeding hotel managers...\n");

  let created = 0;
  let updated = 0;

  for (const mgr of MANAGERS) {
    const hashedPassword = await bcrypt.hash(mgr.password, 12);

    const existing = await Manager.findOne({ email: mgr.email });

    if (existing) {
      // Update existing manager with hotel assignment & password
      await Manager.findOneAndUpdate(
        { email: mgr.email },
        {
          name:              mgr.name,
          password:          hashedPassword,
          role:              mgr.role,
          assignedHotelId:   mgr.assignedHotelId,
          assignedHotelName: mgr.assignedHotelName,
          isActive:          true,
        },
        { new: true }
      );
      console.log(`  ↻  Updated: ${mgr.email} → ${mgr.assignedHotelName}`);
      updated++;
    } else {
      await Manager.create({
        name:              mgr.name,
        email:             mgr.email,
        password:          hashedPassword,
        role:              mgr.role,
        assignedHotelId:   mgr.assignedHotelId,
        assignedHotelName: mgr.assignedHotelName,
        isActive:          true,
      });
      console.log(`  ✅  Created: ${mgr.email} → ${mgr.assignedHotelName}`);
      created++;
    }
  }

  console.log(`\n📊  Summary: ${created} created, ${updated} updated`);
  console.log("\n🔑  Manager Credentials:");
  console.log("─".repeat(70));
  MANAGERS.forEach((m) => {
    console.log(`  ${m.assignedHotelName.padEnd(28)} ${m.email}`);
    console.log(`  ${"".padEnd(28)} Password: ${m.password}`);
    console.log();
  });
  console.log("─".repeat(70));

  await mongoose.connection.close();
  console.log("\n✅  Done. Managers seeded successfully.");
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
