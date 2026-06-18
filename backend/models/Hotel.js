import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  id:          { type: String, required: true },   // "r1", "r2"
  roomTypeId:  { type: String },                   // "standard", "deluxe", "suite", etc.
  name:        { type: String, required: true },
  description: { type: String },
  price:       { type: Number, required: true },
  capacity:    { type: Number, default: 2 },
  bed:         { type: String },
  available:   { type: Number, default: 1 },
  features:    [String],
});

const reviewSchema = new mongoose.Schema({
  author:    { type: String, required: true },
  rating:    { type: Number, min: 1, max: 5 },
  comment:   { type: String },
  date:      { type: String },
  editedAt:  { type: Date },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userEmail: { type: String },
});

const hotelSchema = new mongoose.Schema(
  {
    hotelId:       { type: String, required: true, unique: true }, // "h1","h2"
    name:          { type: String, required: true, trim: true },
    location:      { type: String, required: true },
    city:          { type: String, required: true },
    state:         { type: String, default: "" },
    country:       { type: String, default: "" },
    description:   { type: String },
    image:         { type: String },
    gallery:       [String],
    rating:        { type: Number, min: 1, max: 5 },
    reviewCount:   { type: Number, default: 0 },
    pricePerNight: { type: Number, required: true },
    originalPrice: { type: Number },
    discountPct:   { type: Number, default: 0 },
    isDeal:        { type: Boolean, default: false },
    type:          { type: String, enum: ["Hotel", "Resort", "Villa", "Suite"], default: "Hotel" },
    category:      { type: String, enum: ["Beach", "Mountain", "City", "Desert", "Luxury", "General"], default: "General" },
    coords:        { type: [Number], default: [0, 0] },
    mapUrl:        { type: String, default: "" },
    amenities:     [String],
    rooms:         [roomSchema],
    roomInventory: {
      type: Map,
      of: new mongoose.Schema({
        total: { type: Number, required: true, min: 0 },
        price: { type: Number, required: true, min: 0 }
      }, { _id: false })
    },
    reviews:       [reviewSchema],
    floors:        { type: Number, default: 1 },
    roomsPerFloor: { type: Number, default: 10 },
    roomCount:     { type: Number, default: 0 },
    roomMapEnabled:{ type: Boolean, default: true },
    isActive:      { type: Boolean, default: true },
    ownerId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    currency:      { type: String, default: "USD" },
  },
  { timestamps: true }
);

hotelSchema.index({ city: 1 });
hotelSchema.index({ pricePerNight: 1 });
hotelSchema.index({ isActive: 1 });
hotelSchema.index({ name: 1 });
hotelSchema.index({ state: 1 });
hotelSchema.index({ country: 1 });

// Compound text index for search matching all requested text fields
hotelSchema.index({
  name: "text",
  city: "text",
  state: "text",
  country: "text",
  type: "text",
  category: "text",
  description: "text",
  amenities: "text"
}, {
  weights: {
    name: 10,
    city: 5,
    category: 5,
    state: 3,
    country: 2,
    type: 2,
    description: 1,
    amenities: 1
  },
  name: "HotelSearchTextIndex"
});

const Hotel = mongoose.model("Hotel", hotelSchema);
export default Hotel;
