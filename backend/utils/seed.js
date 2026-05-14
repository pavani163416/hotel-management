import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Hotel from "../models/Hotel.js";
import connectDB from "../config/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const h1 = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80";
const h2 = "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80";
const h3 = "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80";
const h4 = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80";
const h5 = "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80";
const h6 = "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80";

const HOTELS = [
  {
    hotelId: "h1",
    name: "Hôtel de Lumière",
    location: "8th Arrondissement, Paris",
    city: "Paris",
    description: "A timeless masterpiece of French art de vivre, offering panoramic views of the city's most iconic landmarks.",
    image: h1,
    gallery: [h1, h2, h3],
    rating: 4.9,
    reviewCount: 852,
    pricePerNight: 480,
    originalPrice: 600,
    discountPct: 20,
    isDeal: true,
    type: "Hotel",
    coords: [48.8738, 2.2950],
    amenities: ["Free WiFi", "Spa", "Pool", "Restaurant", "Concierge", "Airport Shuttle"],
    rooms: [
      { id: "r1", name: "Deluxe King Room", description: "35 sqm city view with king bed", price: 480, capacity: 2, bed: "1 King Bed", available: 4, features: ["WiFi", "Breakfast", "AC"] },
      { id: "r2", name: "Executive Suite", description: "55 sqm panoramic suite with separate lounge", price: 780, capacity: 3, bed: "1 King Bed + Sofa", available: 2, features: ["WiFi", "Breakfast", "Mini Bar", "Spa Access"] },
      { id: "r3", name: "Panoramic Penthouse", description: "120 sqm penthouse with private terrace", price: 1450, capacity: 4, bed: "2 King Beds", available: 0, features: ["Butler", "Private Spa", "Airport Transfer"] },
    ],
    reviews: [
      { author: "Sophie L.", rating: 5, comment: "Absolutely stunning. The service was impeccable.", date: "2 weeks ago" },
      { author: "Marcus T.", rating: 5, comment: "Best hotel experience in Paris. Worth every euro.", date: "1 month ago" },
    ],
  },
  {
    hotelId: "h2",
    name: "The Azure Skyline",
    location: "Downtown, Tokyo",
    city: "Tokyo",
    description: "Floor-to-ceiling windows reveal a breathtaking city panorama from this contemporary urban sanctuary.",
    image: h2,
    gallery: [h2, h5, h1],
    rating: 4.8,
    reviewCount: 612,
    pricePerNight: 620,
    type: "Hotel",
    coords: [35.6895, 139.6917],
    amenities: ["Free WiFi", "Gym", "Restaurant", "Bar", "Business Center"],
    rooms: [
      { id: "r1", name: "Skyline Room", description: "City view with floor-to-ceiling windows", price: 620, capacity: 2, bed: "1 Queen Bed", available: 6, features: ["WiFi", "AC", "Mini Bar"] },
      { id: "r2", name: "Premium Suite", description: "Corner suite with separate living room", price: 980, capacity: 3, bed: "1 King Bed", available: 3, features: ["WiFi", "Breakfast", "Lounge Access"] },
    ],
    reviews: [
      { author: "Kenji M.", rating: 5, comment: "View is unmatched. Excellent staff.", date: "3 days ago" },
    ],
  },
  {
    hotelId: "h3",
    name: "Coral Bay Resort",
    location: "North Male Atoll, Maldives",
    city: "Maldives",
    description: "An overwater paradise where turquoise lagoons meet sunset skies in seamless tropical luxury.",
    image: h3,
    gallery: [h3, h6, h1],
    rating: 4.9,
    reviewCount: 1029,
    pricePerNight: 1850,
    originalPrice: 2200,
    discountPct: 16,
    isDeal: true,
    type: "Resort",
    coords: [4.1755, 73.5093],
    amenities: ["Infinity Pool", "Spa & Wellness", "Beach Access", "Free WiFi", "Restaurant", "Water Sports"],
    rooms: [
      { id: "r1", name: "Beach Villa", description: "Private beachfront villa with plunge pool", price: 1850, capacity: 2, bed: "1 King Bed", available: 5, features: ["Plunge Pool", "Butler", "Beach Access"] },
      { id: "r2", name: "Overwater Bungalow", description: "Glass-floor bungalow over the lagoon", price: 2400, capacity: 2, bed: "1 King Bed", available: 2, features: ["Glass Floor", "Direct Ocean Access", "Butler"] },
    ],
    reviews: [
      { author: "Anna R.", rating: 5, comment: "Heaven on earth. Will return.", date: "1 week ago" },
    ],
  },
  {
    hotelId: "h4",
    name: "Alpine Peak Lodge",
    location: "Zermatt, Switzerland",
    city: "Zermatt",
    description: "Nestled at the foot of the Matterhorn, an alpine retreat blending rustic warmth with refined luxury.",
    image: h4,
    gallery: [h4, h2, h1],
    rating: 4.7,
    reviewCount: 428,
    pricePerNight: 540,
    originalPrice: 680,
    discountPct: 21,
    isDeal: true,
    type: "Villa",
    coords: [46.0207, 7.7491],
    amenities: ["Ski-in/Ski-out", "Spa", "Free WiFi", "Restaurant", "Fireplace Lounge"],
    rooms: [
      { id: "r1", name: "Alpine Room", description: "Cozy room with mountain views", price: 540, capacity: 2, bed: "1 Queen Bed", available: 8, features: ["WiFi", "Fireplace", "Mountain View"] },
      { id: "r2", name: "Chalet Suite", description: "Two-floor suite with private balcony", price: 920, capacity: 4, bed: "2 King Beds", available: 1, features: ["Balcony", "Sauna", "Ski Storage"] },
    ],
    reviews: [
      { author: "Lukas B.", rating: 5, comment: "Magical. The fondue was incredible.", date: "2 weeks ago" },
    ],
  },
  {
    hotelId: "h5",
    name: "The Grand Metropolitan",
    location: "Manhattan, New York",
    city: "New York",
    description: "An iconic Midtown landmark where Art Deco heritage meets modern hospitality excellence.",
    image: h5,
    gallery: [h5, h2, h1],
    rating: 4.6,
    reviewCount: 1842,
    pricePerNight: 420,
    type: "Hotel",
    coords: [40.7549, -73.9840],
    amenities: ["Free WiFi", "Gym", "Restaurant", "Bar", "Concierge", "Pet Friendly"],
    rooms: [
      { id: "r1", name: "Classic King", description: "Elegant room with skyline view", price: 420, capacity: 2, bed: "1 King Bed", available: 12, features: ["WiFi", "AC", "Smart TV"] },
      { id: "r2", name: "Metropolitan Suite", description: "Spacious suite with city views", price: 720, capacity: 3, bed: "1 King + Sofa", available: 4, features: ["WiFi", "Lounge Access", "Breakfast"] },
    ],
    reviews: [
      { author: "Jessica W.", rating: 4, comment: "Great location, classic NYC luxury.", date: "5 days ago" },
    ],
  },
  {
    hotelId: "h6",
    name: "Santorini Cliff Suites",
    location: "Oia, Santorini",
    city: "Santorini",
    description: "Whitewashed cave suites perched over the caldera, where every sunset is a private masterpiece.",
    image: h6,
    gallery: [h6, h3, h1],
    rating: 4.9,
    reviewCount: 967,
    pricePerNight: 890,
    originalPrice: 1100,
    discountPct: 19,
    isDeal: true,
    type: "Suite",
    coords: [36.4618, 25.3753],
    amenities: ["Infinity Pool", "Spa", "Free WiFi", "Restaurant", "Sunset Terrace"],
    rooms: [
      { id: "r1", name: "Caldera View Suite", description: "Cave suite with private hot tub", price: 890, capacity: 2, bed: "1 King Bed", available: 3, features: ["Hot Tub", "Caldera View", "Breakfast"] },
      { id: "r2", name: "Honeymoon Villa", description: "Private villa with infinity pool", price: 1650, capacity: 2, bed: "1 King Bed", available: 1, features: ["Infinity Pool", "Butler", "Private Terrace"] },
    ],
    reviews: [
      { author: "Emma & David", rating: 5, comment: "Most romantic stay of our lives.", date: "1 month ago" },
    ],
  },
];

export const seedHotels = async () => {
  try {
    await connectDB();
    const count = await Hotel.countDocuments();
    if (count === 0) {
      console.log("🌱 Database is empty. Seeding initial hotels...");
      await Hotel.insertMany(HOTELS);
      console.log("✅ Successfully seeded 6 hotels.");
    } else {
      console.log(`ℹ️ Database already has ${count} hotels. Skipping seed.`);
    }
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
  } finally {
    if (process.argv[1] === fileURLToPath(import.meta.url)) {
      process.exit(0);
    }
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedHotels();
}
