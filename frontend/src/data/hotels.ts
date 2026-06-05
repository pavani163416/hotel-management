export type Room = {
  id: string;
  roomTypeId?: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  bed: string;
  available: number;
  features: string[];
};

export type Review = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
  userId?: string;
  userEmail?: string;
};

export type Hotel = {
  id: string;
  name: string;
  location: string;
  city: string;
  state?: string;
  country?: string;
  description: string;
  image: string;
  gallery: string[];
  rating?: number;
  reviewCount: number;
  pricePerNight: number;
  originalPrice?: number;
  discountPct?: number;
  isDeal?: boolean;
  type?: "Hotel" | "Resort" | "Villa" | "Suite";
  coords: [number, number];
  amenities: string[];
  rooms: Room[];
  reviews: Review[];
  activeBookings?: number;
};

const h1 = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80";
const h2 = "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80";
const h3 = "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80";
const h4 = "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80";
const h5 = "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80";
const h6 = "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80";

export const HOTELS: Hotel[] = [
  {
    id: "h1",
    name: "Hôtel de Lumière",
    location: "8th Arrondissement, Paris",
    city: "Paris",
    state: "Île-de-France",
    country: "France",
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
      { id: "r1", roomTypeId: "deluxe", name: "Deluxe King Room", description: "35 sqm city view with king bed", price: 480, capacity: 2, bed: "1 King Bed", available: 4, features: ["WiFi", "Breakfast", "AC"] },
      { id: "r2", roomTypeId: "suite", name: "Executive Suite", description: "55 sqm panoramic suite with separate lounge", price: 780, capacity: 3, bed: "1 King Bed + Sofa", available: 2, features: ["WiFi", "Breakfast", "Mini Bar", "Spa Access"] },
      { id: "r3", roomTypeId: "penthouse", name: "Panoramic Penthouse", description: "120 sqm penthouse with private terrace", price: 1450, capacity: 4, bed: "2 King Beds", available: 0, features: ["Butler", "Private Spa", "Airport Transfer"] },
    ],
    reviews: [],
  },
  {
    id: "h2",
    name: "The Azure Skyline",
    location: "Downtown, Tokyo",
    city: "Tokyo",
    state: "Tokyo Prefecture",
    country: "Japan",
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
      { id: "r1", roomTypeId: "standard", name: "Skyline Room", description: "City view with floor-to-ceiling windows", price: 620, capacity: 2, bed: "1 Queen Bed", available: 6, features: ["WiFi", "AC", "Mini Bar"] },
      { id: "r2", roomTypeId: "suite", name: "Premium Suite", description: "Corner suite with separate living room", price: 980, capacity: 3, bed: "1 King Bed", available: 3, features: ["WiFi", "Breakfast", "Lounge Access"] },
    ],
    reviews: [],
  },
  {
    id: "h3",
    name: "Coral Bay Resort",
    location: "North Male Atoll, Maldives",
    city: "Maldives",
    state: "Kaafu Atoll",
    country: "Maldives",
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
      { id: "r1", roomTypeId: "villa", name: "Beach Villa", description: "Private beachfront villa with plunge pool", price: 1850, capacity: 2, bed: "1 King Bed", available: 5, features: ["Plunge Pool", "Butler", "Beach Access"] },
      { id: "r2", roomTypeId: "villa", name: "Overwater Bungalow", description: "Glass-floor bungalow over the lagoon", price: 2400, capacity: 2, bed: "1 King Bed", available: 2, features: ["Glass Floor", "Direct Ocean Access", "Butler"] },
    ],
    reviews: [],
  },
  {
    id: "h4",
    name: "Alpine Peak Lodge",
    location: "Zermatt, Switzerland",
    city: "Zermatt",
    state: "Valais",
    country: "Switzerland",
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
      { id: "r1", roomTypeId: "standard", name: "Alpine Room", description: "Cozy room with mountain views", price: 540, capacity: 2, bed: "1 Queen Bed", available: 8, features: ["WiFi", "Fireplace", "Mountain View"] },
      { id: "r2", roomTypeId: "suite", name: "Chalet Suite", description: "Two-floor suite with private balcony", price: 920, capacity: 4, bed: "2 King Beds", available: 1, features: ["Balcony", "Sauna", "Ski Storage"] },
    ],
    reviews: [],
  },
  {
    id: "h5",
    name: "The Grand Metropolitan",
    location: "Manhattan, New York",
    city: "New York",
    state: "NY",
    country: "USA",
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
      { id: "r1", roomTypeId: "standard", name: "Classic King", description: "Elegant room with skyline view", price: 420, capacity: 2, bed: "1 King Bed", available: 12, features: ["WiFi", "AC", "Smart TV"] },
      { id: "r2", roomTypeId: "suite", name: "Metropolitan Suite", description: "Spacious suite with city views", price: 720, capacity: 3, bed: "1 King + Sofa", available: 4, features: ["WiFi", "Lounge Access", "Breakfast"] },
    ],
    reviews: [],
  },
  {
    id: "h6",
    name: "Santorini Cliff Suites",
    location: "Oia, Santorini",
    city: "Santorini",
    state: "Cyclades",
    country: "Greece",
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
      { id: "r1", roomTypeId: "suite", name: "Caldera View Suite", description: "Cave suite with private hot tub", price: 890, capacity: 2, bed: "1 King Bed", available: 3, features: ["Hot Tub", "Caldera View", "Breakfast"] },
      { id: "r2", roomTypeId: "villa", name: "Honeymoon Villa", description: "Private villa with infinity pool", price: 1650, capacity: 2, bed: "1 King Bed", available: 1, features: ["Infinity Pool", "Butler", "Private Terrace"] },
    ],
    reviews: [],
  },
  {
    id: "h8",
    name: "Grand Luxe Paris",
    location: "1st Arrondissement, Paris",
    city: "Paris",
    state: "Île-de-France",
    country: "France",
    description: "An opulent Parisian palace hotel steps from the Louvre, blending Belle Époque grandeur with contemporary luxury.",
    image: h2,
    gallery: [h2, h1, h3],
    rating: 4.9,
    reviewCount: 412,
    pricePerNight: 650,
    originalPrice: 820,
    discountPct: 20,
    isDeal: true,
    type: "Hotel",
    coords: [48.8606, 2.3376],
    amenities: ["Free WiFi", "Spa", "Pool", "Restaurant", "Concierge", "Airport Shuttle", "Bar", "Gym"],
    rooms: [
      { id: "glp-101", roomTypeId: "deluxe", name: "Deluxe King Room", description: "40 sqm room with Louvre views and marble bathroom", price: 650, capacity: 2, bed: "1 King Bed", available: 5, features: ["WiFi", "Breakfast", "AC", "Minibar"] },
      { id: "glp-102", roomTypeId: "suite", name: "Grand Suite", description: "80 sqm suite with separate lounge and panoramic Paris views", price: 1100, capacity: 3, bed: "1 King Bed + Sofa", available: 3, features: ["WiFi", "Breakfast", "Butler", "Spa Access"] },
      { id: "glp-103", roomTypeId: "penthouse", name: "Royal Penthouse", description: "200 sqm penthouse with private terrace and Eiffel Tower view", price: 2800, capacity: 4, bed: "2 King Beds", available: 1, features: ["Private Terrace", "Butler", "Private Spa", "Airport Transfer"] },
    ],
    reviews: [],
  },
];

export const ALL_AMENITIES = ["Free WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar", "Beach Access", "Airport Shuttle"];
