/**
 * Master Seed Script — seeds ALL collections in the athithigriha database
 * Collections: hotels, rooms, guests, bookings, visitors, adminusers
 *
 * Run: cd backend && node utils/seedAll.js
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Hotel    from "../models/Hotel.js";
import Room     from "../models/Room.js";
import Guest    from "../models/Guest.js";
import Booking  from "../models/Booking.js";
import Visitor  from "../models/Visitor.js";
import RoomType from "../models/RoomType.js";
import { generateRoomsForHotel } from "../services/roomGenerationService.js";

// ── Images ────────────────────────────────────────────────
const img = {
  h1: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
  h2: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
  h3: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
  h4: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
  h5: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80",
  h6: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
};

// ════════════════════════════════════════════════════════
// 1. HOTELS
// ════════════════════════════════════════════════════════
const hotelsData = [
  {
    hotelId: "h1", name: "Hôtel de Lumière",
    location: "8th Arrondissement, Paris", city: "Paris", state: "Île-de-France", country: "France",
    description: "A timeless masterpiece of French art de vivre, offering panoramic views of the city's most iconic landmarks.",
    image: img.h1, gallery: [img.h1, img.h2, img.h3],
    reviewCount: 0, pricePerNight: 480, originalPrice: 600, discountPct: 20, isDeal: true,
    type: "Hotel", coords: [48.8738, 2.295],
    amenities: ["Free WiFi", "Spa", "Pool", "Restaurant", "Concierge", "Airport Shuttle"],
    rooms: [
      { id: "r1", roomTypeId: "deluxe", name: "Deluxe King Room",    description: "35 sqm city view",       price: 480,  capacity: 2, bed: "1 King Bed",        available: 4, features: ["WiFi","Breakfast","AC"] },
      { id: "r2", roomTypeId: "suite", name: "Executive Suite",     description: "55 sqm panoramic suite", price: 780,  capacity: 3, bed: "1 King Bed + Sofa", available: 2, features: ["WiFi","Breakfast","Mini Bar"] },
      { id: "r3", roomTypeId: "penthouse", name: "Panoramic Penthouse", description: "120 sqm penthouse",      price: 1450, capacity: 4, bed: "2 King Beds",       available: 1, features: ["Butler","Private Spa"] },
    ],
    roomInventory: {
      deluxe: { total: 4, price: 480 },
      suite: { total: 2, price: 780 },
      penthouse: { total: 1, price: 1450 }
    },
    reviews: [],
  },
  {
    hotelId: "h2", name: "The Azure Skyline",
    location: "Downtown, Tokyo", city: "Tokyo", state: "Tokyo Prefecture", country: "Japan",
    description: "Floor-to-ceiling windows reveal a breathtaking city panorama in the heart of Tokyo.",
    image: img.h2, gallery: [img.h2, img.h5, img.h1],
    reviewCount: 0, pricePerNight: 620,
    type: "Hotel", coords: [35.6895, 139.6917],
    amenities: ["Free WiFi", "Gym", "Restaurant", "Bar", "Business Center"],
    rooms: [
      { id: "r1", roomTypeId: "standard", name: "Skyline Room",   description: "City view room",  price: 620, capacity: 2, bed: "1 Queen Bed", available: 6, features: ["WiFi","AC","Mini Bar"] },
      { id: "r2", roomTypeId: "suite", name: "Premium Suite",  description: "Corner suite",    price: 980, capacity: 3, bed: "1 King Bed",  available: 3, features: ["WiFi","Breakfast"] },
    ],
    roomInventory: {
      standard: { total: 6, price: 620 },
      suite: { total: 3, price: 980 }
    },
    reviews: [],
  },
  {
    hotelId: "h3", name: "Coral Bay Resort",
    location: "North Male Atoll, Maldives", city: "Maldives", state: "Kaafu Atoll", country: "Maldives",
    description: "An overwater paradise where turquoise lagoons meet sunset skies.",
    image: img.h3, gallery: [img.h3, img.h6, img.h1],
    reviewCount: 0, pricePerNight: 1850, originalPrice: 2200, discountPct: 16, isDeal: true,
    type: "Resort", coords: [4.1755, 73.5093],
    amenities: ["Infinity Pool", "Spa & Wellness", "Beach Access", "Free WiFi", "Restaurant", "Water Sports"],
    rooms: [
      { id: "r1", roomTypeId: "villa", name: "Beach Villa",         description: "Private beachfront villa",  price: 1850, capacity: 2, bed: "1 King Bed", available: 5, features: ["Plunge Pool","Butler"] },
      { id: "r2", roomTypeId: "villa", name: "Overwater Bungalow",  description: "Glass-floor bungalow",      price: 2400, capacity: 2, bed: "1 King Bed", available: 2, features: ["Glass Floor","Butler"] },
    ],
    roomInventory: {
      villa: { total: 7, price: 1850 }
    },
    reviews: [],
  },
  {
    hotelId: "h4", name: "Alpine Peak Lodge",
    location: "Zermatt, Switzerland", city: "Zermatt", state: "Valais", country: "Switzerland",
    description: "Nestled at the foot of the Matterhorn, a world-class alpine retreat.",
    image: img.h4, gallery: [img.h4, img.h2, img.h1],
    reviewCount: 0, pricePerNight: 540, originalPrice: 680, discountPct: 21, isDeal: true,
    type: "Villa", coords: [46.0207, 7.7491],
    amenities: ["Ski-in/Ski-out", "Spa", "Free WiFi", "Restaurant", "Fireplace Lounge"],
    rooms: [
      { id: "r1", roomTypeId: "standard", name: "Alpine Room",   description: "Cozy mountain view room", price: 540, capacity: 2, bed: "1 Queen Bed", available: 8, features: ["WiFi","Fireplace"] },
      { id: "r2", roomTypeId: "suite", name: "Chalet Suite",  description: "Two-floor suite",         price: 920, capacity: 4, bed: "2 King Beds", available: 1, features: ["Balcony","Sauna"] },
    ],
    roomInventory: {
      standard: { total: 8, price: 540 },
      suite: { total: 1, price: 920 }
    },
    reviews: [],
  },
  {
    hotelId: "h5", name: "The Grand Metropolitan",
    location: "Manhattan, New York", city: "New York", state: "NY", country: "USA",
    description: "An iconic Midtown landmark where Art Deco heritage meets modern luxury hospitality.",
    image: img.h5, gallery: [img.h5, img.h2, img.h1],
    reviewCount: 0, pricePerNight: 420,
    type: "Hotel", coords: [40.7549, -73.984],
    amenities: ["Free WiFi", "Gym", "Restaurant", "Bar", "Concierge", "Pet Friendly"],
    rooms: [
      { id: "r1", roomTypeId: "standard", name: "Classic King",          description: "Elegant skyline view room",  price: 420, capacity: 2, bed: "1 King Bed",     available: 12, features: ["WiFi","AC","Smart TV"] },
      { id: "r2", roomTypeId: "suite", name: "Metropolitan Suite",    description: "Spacious city view suite",   price: 720, capacity: 3, bed: "1 King + Sofa",  available: 4,  features: ["WiFi","Lounge Access"] },
    ],
    roomInventory: {
      standard: { total: 12, price: 420 },
      suite: { total: 4, price: 720 }
    },
    reviews: [],
  },
  {
    hotelId: "h6", name: "Santorini Cliff Suites",
    location: "Oia, Santorini", city: "Santorini", state: "Cyclades", country: "Greece",
    description: "Whitewashed cave suites perched dramatically over the caldera with iconic sunset views.",
    image: img.h6, gallery: [img.h6, img.h3, img.h1],
    reviewCount: 0, pricePerNight: 890, originalPrice: 1100, discountPct: 19, isDeal: true,
    type: "Suite", coords: [36.4618, 25.3753],
    amenities: ["Infinity Pool", "Spa", "Free WiFi", "Restaurant", "Sunset Terrace"],
    rooms: [
      { id: "r1", roomTypeId: "suite", name: "Caldera View Suite", description: "Cave suite with hot tub",          price: 890,  capacity: 2, bed: "1 King Bed", available: 3, features: ["Hot Tub","Caldera View"] },
      { id: "r2", roomTypeId: "villa", name: "Honeymoon Villa",    description: "Private villa with infinity pool", price: 1650, capacity: 2, bed: "1 King Bed", available: 1, features: ["Infinity Pool","Butler"] },
    ],
    roomInventory: {
      suite: { total: 3, price: 890 },
      villa: { total: 1, price: 1650 }
    },
    reviews: [],
  },
];

// ════════════════════════════════════════════════════════
// 2. ROOMS (individual inventory — matches hotel rooms)
// ════════════════════════════════════════════════════════
const roomsData = [
  { roomNumber: "h1_r1", type: "Deluxe",    description: "35 sqm city view with king bed",              pricePerNight: 480,  capacity: 2, bedType: "King",  floor: 2,  amenities: ["Free WiFi","Breakfast","AC"],                  images: [img.h1], status: "Available" },
  { roomNumber: "h1_r2", type: "Suite",     description: "55 sqm panoramic suite with separate lounge", pricePerNight: 780,  capacity: 3, bedType: "King",  floor: 3,  amenities: ["Free WiFi","Breakfast","Mini Bar","Spa Access"], images: [img.h1], status: "Available" },
  { roomNumber: "h1_r3", type: "Penthouse", description: "120 sqm penthouse with private terrace",      pricePerNight: 1450, capacity: 4, bedType: "King",  floor: 10, amenities: ["Butler","Private Spa","Airport Transfer"],       images: [img.h1], status: "Available" },
  { roomNumber: "h2_r1", type: "Standard",  description: "City view with floor-to-ceiling windows",     pricePerNight: 620,  capacity: 2, bedType: "Queen", floor: 5,  amenities: ["Free WiFi","AC","Mini Bar"],                    images: [img.h2], status: "Available" },
  { roomNumber: "h2_r2", type: "Suite",     description: "Corner suite with separate living room",       pricePerNight: 980,  capacity: 3, bedType: "King",  floor: 8,  amenities: ["Free WiFi","Breakfast","Lounge Access"],        images: [img.h2], status: "Available" },
  { roomNumber: "h3_r1", type: "Villa",     description: "Private beachfront villa with plunge pool",    pricePerNight: 1850, capacity: 2, bedType: "King",  floor: 1,  amenities: ["Plunge Pool","Butler","Beach Access"],          images: [img.h3], status: "Available" },
  { roomNumber: "h3_r2", type: "Villa",     description: "Glass-floor bungalow over the lagoon",         pricePerNight: 2400, capacity: 2, bedType: "King",  floor: 1,  amenities: ["Glass Floor","Direct Ocean Access","Butler"],   images: [img.h3], status: "Available" },
  { roomNumber: "h4_r1", type: "Standard",  description: "Cozy room with mountain views",                pricePerNight: 540,  capacity: 2, bedType: "Queen", floor: 1,  amenities: ["Free WiFi","Fireplace","Mountain View"],        images: [img.h4], status: "Available" },
  { roomNumber: "h4_r2", type: "Suite",     description: "Two-floor suite with private balcony",         pricePerNight: 920,  capacity: 4, bedType: "King",  floor: 2,  amenities: ["Balcony","Sauna","Ski Storage"],                images: [img.h4], status: "Available" },
  { roomNumber: "h5_r1", type: "Standard",  description: "Elegant room with skyline view",               pricePerNight: 420,  capacity: 2, bedType: "King",  floor: 3,  amenities: ["Free WiFi","AC","Smart TV"],                    images: [img.h5], status: "Available" },
  { roomNumber: "h5_r2", type: "Suite",     description: "Spacious suite with city views",               pricePerNight: 720,  capacity: 3, bedType: "King",  floor: 6,  amenities: ["Free WiFi","Lounge Access","Breakfast"],        images: [img.h5], status: "Available" },
  { roomNumber: "h6_r1", type: "Suite",     description: "Cave suite with private hot tub",              pricePerNight: 890,  capacity: 2, bedType: "King",  floor: 1,  amenities: ["Hot Tub","Caldera View","Breakfast"],           images: [img.h6], status: "Available" },
  { roomNumber: "h6_r2", type: "Villa",     description: "Private villa with infinity pool",             pricePerNight: 1650, capacity: 2, bedType: "King",  floor: 2,  amenities: ["Infinity Pool","Butler","Private Terrace"],     images: [img.h6], status: "Available" },
];

// ════════════════════════════════════════════════════════
// 3. GUESTS (sample customers)
// ════════════════════════════════════════════════════════
const guestsData = [
  { name: "Elena Rodriguez", email: "elena.rodriguez@example.com", phone: "+1 555 001 0001", city: "Miami" },
  { name: "Jameson Blake",   email: "j.blake@enterprise.com",      phone: "+1 555 001 0002", city: "New York" },
  { name: "Sarah Chen",      email: "sarah.chen@studio.co",        phone: "+1 555 001 0003", city: "San Francisco" },
  { name: "Michael Chang",   email: "m.chang@webnet.net",          phone: "+1 555 001 0004", city: "Chicago" },
  { name: "Priya Sharma",    email: "priya.sharma@design.io",      phone: "+91 98765 43210", city: "Mumbai" },
  { name: "Carlos Rivera",   email: "c.rivera@corp.com",           phone: "+52 55 1234 5678", city: "Mexico City" },
];

// ════════════════════════════════════════════════════════
// 4. VISITORS (sample portal visitors)
// ════════════════════════════════════════════════════════
const visitorsData = [
  { ip: "103.21.244.12",  country: "India",          countryCode: "IN", city: "Mumbai",        device: "Mobile",  browser: "Chrome",  os: "Android", page: "/hotels",   referrer: "google.com",    duration: 142, status: "Converted", sessionId: "sid001" },
  { ip: "185.60.216.35",  country: "United Kingdom", countryCode: "GB", city: "London",        device: "Desktop", browser: "Safari",  os: "macOS",   page: "/hotel/h2", referrer: "instagram.com", duration: 310, status: "Active",    sessionId: "sid002" },
  { ip: "72.229.28.185",  country: "United States",  countryCode: "US", city: "New York",      device: "Desktop", browser: "Chrome",  os: "Windows", page: "/",         referrer: "direct",        duration: 28,  status: "Bounced",   sessionId: "sid003" },
  { ip: "49.206.212.100", country: "India",          countryCode: "IN", city: "Bangalore",     device: "Mobile",  browser: "Chrome",  os: "Android", page: "/hotels",   referrer: "google.com",    duration: 198, status: "Converted", sessionId: "sid004" },
  { ip: "31.13.64.35",    country: "Germany",        countryCode: "DE", city: "Berlin",        device: "Desktop", browser: "Firefox", os: "Linux",   page: "/hotel/h1", referrer: "facebook.com",  duration: 87,  status: "Active",    sessionId: "sid005" },
  { ip: "202.43.120.55",  country: "Japan",          countryCode: "JP", city: "Tokyo",         device: "Mobile",  browser: "Safari",  os: "iOS",     page: "/booking",  referrer: "google.com",    duration: 420, status: "Converted", sessionId: "sid006" },
  { ip: "89.187.162.200", country: "France",         countryCode: "FR", city: "Paris",         device: "Desktop", browser: "Chrome",  os: "Windows", page: "/hotel/h1", referrer: "direct",        duration: 265, status: "Converted", sessionId: "sid007" },
  { ip: "116.58.246.11",  country: "Australia",      countryCode: "AU", city: "Sydney",        device: "Tablet",  browser: "Safari",  os: "iPadOS",  page: "/",         referrer: "google.com",    duration: 44,  status: "Bounced",   sessionId: "sid008" },
  { ip: "177.71.128.60",  country: "Brazil",         countryCode: "BR", city: "São Paulo",     device: "Mobile",  browser: "Chrome",  os: "Android", page: "/hotels",   referrer: "google.com",    duration: 180, status: "Active",    sessionId: "sid009" },
  { ip: "5.62.58.100",    country: "UAE",            countryCode: "AE", city: "Dubai",         device: "Desktop", browser: "Edge",    os: "Windows", page: "/hotel/h2", referrer: "direct",        duration: 390, status: "Converted", sessionId: "sid010" },
  { ip: "122.160.97.45",  country: "India",          countryCode: "IN", city: "Delhi",         device: "Mobile",  browser: "Chrome",  os: "Android", page: "/booking",  referrer: "google.com",    duration: 510, status: "Converted", sessionId: "sid011" },
  { ip: "37.19.200.50",   country: "Canada",         countryCode: "CA", city: "Toronto",       device: "Desktop", browser: "Firefox", os: "Windows", page: "/",         referrer: "bing.com",      duration: 35,  status: "Bounced",   sessionId: "sid012" },
  { ip: "103.47.144.22",  country: "Singapore",      countryCode: "SG", city: "Singapore",     device: "Mobile",  browser: "Safari",  os: "iOS",     page: "/hotels",   referrer: "instagram.com", duration: 230, status: "Converted", sessionId: "sid013" },
  { ip: "66.249.64.20",   country: "United States",  countryCode: "US", city: "San Francisco", device: "Desktop", browser: "Chrome",  os: "macOS",   page: "/hotel/h3", referrer: "google.com",    duration: 120, status: "Active",    sessionId: "sid014" },
  { ip: "41.203.64.10",   country: "Nigeria",        countryCode: "NG", city: "Lagos",         device: "Mobile",  browser: "Chrome",  os: "Android", page: "/hotels",   referrer: "twitter.com",   duration: 55,  status: "Bounced",   sessionId: "sid015" },
];

// ════════════════════════════════════════════════════════
// 5. ADMIN USERS (controller/admin panel users)
// ════════════════════════════════════════════════════════
const adminUsersData = [
  { name: "Marcus Thorne",  email: "admin@athithigriha.com",   password: "admin123",    role: "Super Admin" },
  { name: "Priya Kapoor",   email: "manager@athithigriha.com", password: "manager123",  role: "Manager" },
  { name: "David Chen",     email: "staff@athithigriha.com",   password: "staff123",    role: "Staff" },
];


// ════════════════════════════════════════════════════════
// SEED RUNNER — Seeds structural data only (Hotels, Rooms, RoomTypes)
// NEVER seeds fake transactional data (guests, bookings, visitors, payments)
// ════════════════════════════════════════════════════════
const seed = async () => {
  await connectDB();
  console.log("\n🌱  AthithiGriha Seed — structural data only\n");

  // ── Clear structural collections only ─────────────────
  await Promise.all([
    Hotel.deleteMany({}),
    Room.deleteMany({}),
    RoomType.deleteMany({}),
  ]);
  console.log("🗑️  Cleared hotels, rooms, roomTypes\n");

  // ── Seed RoomTypes ─────────────────────────────────────
  const roomTypesData = [
    { code: "standard",  name: "Standard",  active: true },
    { code: "deluxe",    name: "Deluxe",    active: true },
    { code: "suite",     name: "Suite",     active: true },
    { code: "penthouse", name: "Penthouse", active: true },
    { code: "villa",     name: "Villa",     active: true },
  ];
  const seededRoomTypes = await RoomType.insertMany(roomTypesData);
  console.log(`✅  RoomTypes  → ${seededRoomTypes.length} seeded`);

  // ── Seed Hotels ────────────────────────────────────────
  const hotels = await Hotel.insertMany(hotelsData);
  console.log(`✅  Hotels     → ${hotels.length} seeded`);
  hotels.forEach(h => console.log(`    ${h.hotelId.padEnd(4)} ${h.name} (${h.city})`));

  // ── Generate Rooms from Inventory ──────────────────────
  for (const hotel of hotels) {
    await generateRoomsForHotel(hotel);
  }
  const rooms = await Room.find({});
  console.log(`\n✅  Rooms      → ${rooms.length} generated from inventory`);
  rooms.slice(0, 10).forEach(r => console.log(`    ${r.roomNumber.padEnd(8)} ${r.type.padEnd(12)} $${r.pricePerNight}/night`));
  if (rooms.length > 10) console.log(`    ... and ${rooms.length - 10} more rooms`);

  console.log("\n" + "─".repeat(50));
  console.log("✅  Structural seed complete.");
  console.log("📝  Guests, bookings, and payments will be created by real users.");
  console.log("─".repeat(50) + "\n");

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});

