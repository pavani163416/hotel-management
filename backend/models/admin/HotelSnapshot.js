import mongoose from "mongoose";

// Stored in: controller database
// Admin-managed hotel records (separate from user-facing athithigriha.hotels)
const schema = new mongoose.Schema(
  {
    hotelId:       { type: String, required: true, unique: true },
    name:          { type: String, required: true },
    location:      { type: String },
    city:          { type: String },
    country:       { type: String },
    totalRooms:    { type: Number, default: 0 },
    activeBookings:{ type: Number, default: 0 },
    ytdRevenue:    { type: Number, default: 0 },
    status:        { type: String, enum: ["Active", "Maintenance", "Inactive"], default: "Active" },
    image:         { type: String },
    subtitle:      { type: String },
  },
  { timestamps: true }
);

export default (conn) => conn.model("HotelSnapshot", schema);
