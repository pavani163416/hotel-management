import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  id:          { type: String, required: true },   // "r1", "r2"
  name:        { type: String, required: true },
  description: { type: String },
  price:       { type: Number, required: true },
  capacity:    { type: Number, default: 2 },
  bed:         { type: String },
  available:   { type: Number, default: 1 },
  features:    [String],
});

const reviewSchema = new mongoose.Schema({
  author:  { type: String, required: true },
  rating:  { type: Number, min: 1, max: 5 },
  comment: { type: String },
  date:    { type: String },
});

const hotelSchema = new mongoose.Schema(
  {
    hotelId:       { type: String, required: true, unique: true }, // "h1","h2"
    name:          { type: String, required: true, trim: true },
    location:      { type: String, required: true },
    city:          { type: String, required: true },
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
    coords:        { type: [Number], default: [0, 0] },
    amenities:     [String],
    rooms:         [roomSchema],
    reviews:       [reviewSchema],
    isActive:      { type: Boolean, default: true },
  },
  { timestamps: true }
);

hotelSchema.index({ city: 1 });
hotelSchema.index({ pricePerNight: 1 });
hotelSchema.index({ isActive: 1 });

const Hotel = mongoose.model("Hotel", hotelSchema);
export default Hotel;
