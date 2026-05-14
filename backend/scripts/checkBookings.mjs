import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI);

const Booking = (await import("../models/Booking.js")).default;
const Guest   = (await import("../models/Guest.js")).default;

console.log("\n=== LAST 5 BOOKINGS ===");
const bookings = await Booking.find({})
  .select("guestSnapshot status totalAmount hotelName createdAt")
  .sort({ createdAt: -1 })
  .limit(5)
  .lean();

bookings.forEach(b => {
  console.log(`  ${b.guestSnapshot?.email} | ${b.status} | $${b.totalAmount} | ${b.hotelName} | ${new Date(b.createdAt).toLocaleString()}`);
});

console.log("\n=== GUESTS WITH BOOKING COUNTS ===");
const guests = await Guest.find({}).select("name email bookings").lean();
guests.forEach(g => {
  console.log(`  ${g.name} (${g.email}) → ${g.bookings?.length || 0} linked bookings`);
});

console.log("\n=== BOOKINGS BY SNAPSHOT EMAIL ===");
const emails = [...new Set(bookings.map(b => b.guestSnapshot?.email).filter(Boolean))];
for (const email of emails) {
  const count = await Booking.countDocuments({ "guestSnapshot.email": email });
  console.log(`  ${email}: ${count} bookings by snapshot`);
}

await mongoose.disconnect();
