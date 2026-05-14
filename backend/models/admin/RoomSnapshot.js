/**
 * RoomSnapshot — stored in controller DB
 * Mirrors room data for admin panel visibility
 */
import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    roomNumber:    { type: String, required: true, unique: true },
    hotelId:       { type: String, required: true },
    hotelName:     { type: String },
    name:          { type: String },
    type:          { type: String, enum: ["Standard", "Deluxe", "Suite", "Penthouse", "Villa"], default: "Standard" },
    pricePerNight: { type: Number, default: 0 },
    capacity:      { type: Number, default: 2 },
    bed:           { type: String },
    available:     { type: Number, default: 1 },
    features:      [String],
    status:        { type: String, enum: ["Available", "Booked", "Maintenance"], default: "Available" },
  },
  { timestamps: true }
);

export default (conn) => conn.model("RoomSnapshot", schema);
