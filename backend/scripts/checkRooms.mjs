import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import mongoose from "mongoose";
import dns from "dns";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const roomSchema = new mongoose.Schema({
  roomNumber: String, type: String, status: String,
  hotelStringId: String, pricePerNight: Number, isActive: Boolean,
}, { collection: "rooms" });
const Room = mongoose.model("Room", roomSchema);

await mongoose.connect(process.env.MONGO_URI);
const rooms = await Room.find({}).select("roomNumber type status hotelStringId pricePerNight isActive").lean();
console.log("\nRooms in MongoDB:");
rooms.forEach(r => console.log(`  ${r.roomNumber.padEnd(12)} | ${r.type.padEnd(10)} | ${r.status.padEnd(12)} | hotel:${r.hotelStringId || "none"} | ₹${r.pricePerNight}`));
console.log(`\nTotal: ${rooms.length} rooms`);
await mongoose.connection.close();
process.exit(0);
