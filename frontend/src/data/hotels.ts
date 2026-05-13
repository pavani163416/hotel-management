export type Room = {
  id: string;
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
};

export type Hotel = {
  id: string;
  name: string;
  location: string;
  city: string;
  description: string;
  image: string;
  gallery: string[];
  rating: number;
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
      { id: "rv1", author: "Sophie L.", rating: 5, comment: "Absolutely stunning. The service was impeccable and the views of the Eiffel Tower were breathtaking.", date: "2 weeks ago" },
      { id: "rv2", author: "Marcus T.", rating: 5, comment: "Best hotel experience in Paris. Worth every euro for the luxury and comfort provided.", date: "1 month ago" },
      { id: "rv3", author: "Elena G.", rating: 4, comment: "The spa is world-class. A truly relaxing escape in the heart of the city.", date: "2 months ago" },
      { id: "rv4", author: "James D.", rating: 5, comment: "The concierge team went above and beyond to secure us last-minute reservations.", date: "3 months ago" },
    ],
  },
  {
    id: "h2",
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
      { id: "rv1", author: "Kenji M.", rating: 5, comment: "View is unmatched. Excellent staff who anticipated our every need.", date: "3 days ago" },
      { id: "rv2", author: "Sarah P.", rating: 4, comment: "Modern design and very quiet despite being in a busy area. High-tech features were a plus.", date: "3 weeks ago" },
      { id: "rv3", author: "Michael B.", rating: 5, comment: "The breakfast spread was incredible, featuring both Western and Japanese options.", date: "1 month ago" },
    ],
  },
  {
    id: "h3",
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
      { id: "rv1", author: "Anna R.", rating: 5, comment: "Heaven on earth. The overwater bungalow offered total privacy and crystal clear water.", date: "1 week ago" },
      { id: "rv2", author: "Robert K.", rating: 5, comment: "The most relaxing vacation I've ever had. Every detail was perfect.", date: "1 month ago" },
      { id: "rv3", author: "Linda M.", rating: 5, comment: "Swimming with turtles right from our villa was an experience I'll never forget.", date: "2 months ago" },
    ],
  },
  {
    id: "h4",
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
      { id: "rv1", author: "Lukas B.", rating: 5, comment: "Magical atmosphere. The Matterhorn view from our balcony was spectacular.", date: "2 weeks ago" },
      { id: "rv2", author: "Heidi S.", rating: 4, comment: "Beautiful design and great spa after a long day on the slopes.", date: "1 month ago" },
      { id: "rv3", author: "Thomas W.", rating: 5, comment: "Best location in Zermatt. The service was warm and welcoming.", date: "2 months ago" },
    ],
  },
  {
    id: "h5",
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
      { id: "rv1", author: "Jessica W.", rating: 4, comment: "Great location, classic NYC luxury. Close to everything in Midtown.", date: "5 days ago" },
      { id: "rv2", author: "David L.", rating: 5, comment: "Historic feel with modern amenities. The bar has a great vibe.", date: "2 weeks ago" },
      { id: "rv3", author: "Emily S.", rating: 4, comment: "Room was smaller than expected but very well-appointed and comfortable.", date: "1 month ago" },
    ],
  },
  {
    id: "h6",
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
      { id: "rv1", author: "Emma & David", rating: 5, comment: "Most romantic stay of our lives. The private pool overlooking the caldera was magic.", date: "1 month ago" },
      { id: "rv2", author: "Sophia T.", rating: 5, comment: "Breathtaking views and exceptional service. A true bucket-list experience.", date: "2 months ago" },
      { id: "rv3", author: "John H.", rating: 4, comment: "Beautiful property. A bit of a climb to get to, but well worth it for the view.", date: "3 months ago" },
    ],
  },
  {
    id: "h8",
    name: "Grand Luxe Paris",
    location: "1st Arrondissement, Paris",
    city: "Paris",
    description: "An opulent Parisian palace hotel steps from the Louvre, blending Belle Époque grandeur with contemporary luxury.",
    image: h2,
    gallery: [h2, h1, h3],
    rating: 4.9,
    reviewCount: 724,
    pricePerNight: 650,
    originalPrice: 820,
    discountPct: 20,
    isDeal: true,
    type: "Hotel",
    coords: [48.8606, 2.3376],
    amenities: ["Free WiFi", "Spa", "Pool", "Restaurant", "Concierge", "Airport Shuttle", "Bar", "Gym"],
    rooms: [
      { id: "glp-101", name: "Deluxe King Room", description: "40 sqm room with Louvre views and marble bathroom", price: 650, capacity: 2, bed: "1 King Bed", available: 5, features: ["WiFi", "Breakfast", "AC", "Minibar"] },
      { id: "glp-102", name: "Grand Suite", description: "80 sqm suite with separate lounge and panoramic Paris views", price: 1100, capacity: 3, bed: "1 King Bed + Sofa", available: 3, features: ["WiFi", "Breakfast", "Butler", "Spa Access"] },
      { id: "glp-103", name: "Royal Penthouse", description: "200 sqm penthouse with private terrace and Eiffel Tower view", price: 2800, capacity: 4, bed: "2 King Beds", available: 1, features: ["Private Terrace", "Butler", "Private Spa", "Airport Transfer"] },
    ],
    reviews: [
      { id: "rv1", author: "Isabelle M.", rating: 5, comment: "The most luxurious hotel in Paris. Service is absolutely flawless.", date: "1 week ago" },
      { id: "rv2", author: "Charles D.", rating: 5, comment: "Woke up to a view of the Louvre. Truly unforgettable.", date: "2 weeks ago" },
      { id: "rv3", author: "Victoria R.", rating: 5, comment: "The spa is world-class. We will definitely return.", date: "1 month ago" },
    ],
  },
];

export const ALL_AMENITIES = ["Free WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar", "Beach Access", "Airport Shuttle"];
