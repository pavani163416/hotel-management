import "dotenv/config";
import mongoose from "mongoose";
import Hotel from "./models/Hotel.js";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  const hotels = await Hotel.find({});
  for (const h of hotels) {
    if (h.reviews.length === 0) {
      console.log(`Updating ${h.name}...`);
      h.reviews = [
        { author: "Sophie L.", rating: 5, comment: "Absolutely stunning. Service was impeccable.", date: "2 weeks ago" },
        { author: "Marcus T.", rating: 5, comment: "Best hotel experience. Worth every euro.", date: "1 month ago" }
      ];
      h.reviewCount = 852;
      await h.save();
    }
  }
  console.log("Done");
  process.exit(0);
}

run().catch(console.error);
