/**
 * Seed script — populates the hotels collection in MongoDB
 * Run: cd backend && node utils/seedHotels.js
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import Hotel from "../models/Hotel.js";
import connectDB from "../config/db.js";

const h1 = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80";
const h2 = "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80";
const h3 = "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80";
const h4 = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80";
const h5 = "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80";
const h6 = "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80";

const hotels = [
  {
    hotelId: "h1", name: "Hôtel de Lumière",
    location: "8th Arrondissement, Paris", city: "Paris", state: "Île-de-France", country: "France",
    description: "A timeless masterpiece of French art de vivre, offering panoramic views of the city's most iconic landmarks.",
    image: h1, gallery: [h1, h2, h3],
    rating: 4.9, reviewCount: 852, pricePerNight: 480, originalPrice: 600, discountPct: 20, isDeal: true,
    type: "Hotel", coords: [48.8738, 2.295],
    amenities: ["Free WiFi", "Spa", "Pool", "Restaurant", "Concierge", "Airport Shuttle"],
    rooms: [
      { id: "hdl-101", name: "Deluxe King Room", description: "35 sqm city view", price: 480, capacity: 2, bed: "1 King Bed", available: 4, features: ["WiFi", "Breakfast", "AC"] },
      { id: "hdl-102", name: "Executive Suite", description: "55 sqm panoramic suite", price: 780, capacity: 3, bed: "1 King Bed + Sofa", available: 2, features: ["WiFi", "Breakfast", "Mini Bar"] },
      { id: "hdl-103", name: "Panoramic Penthouse", description: "120 sqm penthouse", price: 1450, capacity: 4, bed: "2 King Beds", available: 1, features: ["Butler", "Private Spa"] },
    ],
    reviews: [{ author: "Sophie L.", rating: 5, comment: "Absolutely stunning.", date: "2 weeks ago" }],
  },
  {
    hotelId: "h2", name: "The Azure Skyline",
    location: "Downtown, Tokyo", city: "Tokyo", state: "Tokyo Prefecture", country: "Japan",
    description: "Floor-to-ceiling windows reveal a breathtaking city panorama.",
    image: h2, gallery: [h2, h5, h1],
    rating: 4.8, reviewCount: 612, pricePerNight: 620,
    type: "Hotel", coords: [35.6895, 139.6917],
    amenities: ["Free WiFi", "Gym", "Restaurant", "Bar", "Business Center"],
    rooms: [
      { id: "tas-101", name: "Skyline Room", description: "City view room", price: 620, capacity: 2, bed: "1 Queen Bed", available: 6, features: ["WiFi", "AC", "Mini Bar"] },
      { id: "tas-102", name: "Premium Suite", description: "Corner suite", price: 980, capacity: 3, bed: "1 King Bed", available: 3, features: ["WiFi", "Breakfast"] },
    ],
    reviews: [{ author: "Kenji M.", rating: 5, comment: "View is unmatched.", date: "3 days ago" }],
  },
  {
    hotelId: "h3", name: "Coral Bay Resort",
    location: "North Male Atoll, Maldives", city: "Maldives", state: "Kaafu Atoll", country: "Maldives",
    description: "An overwater paradise where turquoise lagoons meet sunset skies.",
    image: h3, gallery: [h3, h6, h1],
    rating: 4.9, reviewCount: 1029, pricePerNight: 1850, originalPrice: 2200, discountPct: 16, isDeal: true,
    type: "Resort", coords: [4.1755, 73.5093],
    amenities: ["Infinity Pool", "Spa & Wellness", "Beach Access", "Free WiFi", "Restaurant", "Water Sports"],
    rooms: [
      { id: "cbr-101", name: "Beach Villa", description: "Private beachfront villa", price: 1850, capacity: 2, bed: "1 King Bed", available: 5, features: ["Plunge Pool", "Butler"] },
      { id: "cbr-102", name: "Overwater Bungalow", description: "Glass-floor bungalow", price: 2400, capacity: 2, bed: "1 King Bed", available: 2, features: ["Glass Floor", "Butler"] },
    ],
    reviews: [{ author: "Anna R.", rating: 5, comment: "Heaven on earth.", date: "1 week ago" }],
  },
  {
    hotelId: "h4", name: "Alpine Peak Lodge",
    location: "Zermatt, Switzerland", city: "Zermatt", state: "Valais", country: "Switzerland",
    description: "Nestled at the foot of the Matterhorn, an alpine retreat.",
    image: h4, gallery: [h4, h2, h1],
    rating: 4.7, reviewCount: 428, pricePerNight: 540, originalPrice: 680, discountPct: 21, isDeal: true,
    type: "Villa", coords: [46.0207, 7.7491],
    amenities: ["Ski-in/Ski-out", "Spa", "Free WiFi", "Restaurant", "Fireplace Lounge"],
    rooms: [
      { id: "apl-101", name: "Alpine Room", description: "Cozy mountain view room", price: 540, capacity: 2, bed: "1 Queen Bed", available: 8, features: ["WiFi", "Fireplace"] },
      { id: "apl-102", name: "Chalet Suite", description: "Two-floor suite", price: 920, capacity: 4, bed: "2 King Beds", available: 1, features: ["Balcony", "Sauna"] },
    ],
    reviews: [{ author: "Lukas B.", rating: 5, comment: "Magical.", date: "2 weeks ago" }],
  },
  {
    hotelId: "h5", name: "The Grand Metropolitan",
    location: "Manhattan, New York", city: "New York", state: "NY", country: "USA",
    description: "An iconic Midtown landmark where Art Deco heritage meets modern hospitality.",
    image: h5, gallery: [h5, h2, h1],
    rating: 4.6, reviewCount: 1842, pricePerNight: 420,
    type: "Hotel", coords: [40.7549, -73.984],
    amenities: ["Free WiFi", "Gym", "Restaurant", "Bar", "Concierge", "Pet Friendly"],
    rooms: [
      { id: "tgm-101", name: "Classic King", description: "Elegant skyline view room", price: 420, capacity: 2, bed: "1 King Bed", available: 12, features: ["WiFi", "AC", "Smart TV"] },
      { id: "tgm-102", name: "Metropolitan Suite", description: "Spacious city view suite", price: 720, capacity: 3, bed: "1 King + Sofa", available: 4, features: ["WiFi", "Lounge Access"] },
    ],
    reviews: [{ author: "Jessica W.", rating: 4, comment: "Great location.", date: "5 days ago" }],
  },
  {
    hotelId: "h6", name: "Santorini Cliff Suites",
    location: "Oia, Santorini", city: "Santorini", state: "Cyclades", country: "Greece",
    description: "Whitewashed cave suites perched over the caldera.",
    image: h6, gallery: [h6, h3, h1],
    rating: 4.9, reviewCount: 967, pricePerNight: 890, originalPrice: 1100, discountPct: 19, isDeal: true,
    type: "Suite", coords: [36.4618, 25.3753],
    amenities: ["Infinity Pool", "Spa", "Free WiFi", "Restaurant", "Sunset Terrace"],
    rooms: [
      { id: "scs-101", name: "Caldera View Suite", description: "Cave suite with hot tub", price: 890, capacity: 2, bed: "1 King Bed", available: 3, features: ["Hot Tub", "Caldera View"] },
      { id: "scs-102", name: "Honeymoon Villa", description: "Private villa with infinity pool", price: 1650, capacity: 2, bed: "1 King Bed", available: 1, features: ["Infinity Pool", "Butler"] },
    ],
    reviews: [{ author: "Emma & David", rating: 5, comment: "Most romantic stay.", date: "1 month ago" }],
  },
];

const seed = async () => {
  await connectDB();
  await Hotel.deleteMany({});
  console.log("🗑️  Cleared existing hotels");
  const inserted = await Hotel.insertMany(hotels);
  console.log(`🌱  Seeded ${inserted.length} hotels into MongoDB`);
  inserted.forEach((h) => console.log(`    ${h.hotelId.padEnd(4)} → ${h.name} (${h.city})`));
  await mongoose.connection.close();
  console.log("\n✅  Done");
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
