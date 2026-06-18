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
  breakfastIncluded?: boolean;
  freeCancellation?: boolean;
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
  rating?: number;
  reviewCount: number;
  pricePerNight: number;
  originalPrice?: number;
  discountPct?: number;
  isDeal?: boolean;
  type?: "Hotel" | "Resort" | "Villa" | "Suite";
  coords: [number, number];
  mapUrl?: string;
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

export const HOTELS: Hotel[] = [];

export const ALL_AMENITIES = ["Free WiFi", "Pool", "Spa", "Gym", "Restaurant", "Bar", "Beach Access", "Airport Shuttle"];
