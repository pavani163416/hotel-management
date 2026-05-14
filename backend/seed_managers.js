import "dotenv/config";
import mongoose from "mongoose";
import Manager from "./models/Manager.js";
import Hotel from "./models/Hotel.js";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  const hotels = await Hotel.find({});
  console.log(`Found ${hotels.length} hotels`);

  const managers = [
    { name: "John Paris", email: "paris@hotel.com", hotelId: "h1", hotelName: "Hôtel de Lumière" },
    { name: "Yuki Tokyo", email: "tokyo@hotel.com", hotelId: "h2", hotelName: "The Azure Skyline" },
    { name: "Sarah Maldives", email: "maldives@hotel.com", hotelId: "h3", hotelName: "Coral Bay Resort" },
  ];

  for (const m of managers) {
    const existing = await Manager.findOne({ email: m.email });
    if (!existing) {
      const hotel = hotels.find(h => h.hotelId === m.hotelId);
      await Manager.create({
        name: m.name,
        email: m.email,
        password: Buffer.from("manager123").toString("base64"),
        role: "Manager",
        assignedHotelId: m.hotelId,
        assignedHotelName: m.hotelName,
        hotelObjectId: hotel ? hotel._id : null,
        isActive: true
      });
      console.log(`Created manager in NEW table: ${m.name}`);
    } else {
      console.log(`Manager ${m.name} already exists in NEW table`);
    }
  }

  console.log("Seed complete for dedicated managers collection");
  process.exit(0);
}

run().catch(console.error);
