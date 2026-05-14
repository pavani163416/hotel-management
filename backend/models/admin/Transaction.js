import mongoose from "mongoose";

// Stored in: controller database
// Every payment made through the user panel is mirrored here
const schema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    bookingRef:    { type: String, required: true },   // e.g. "LS-00957"
    bookingId:     { type: String },                   // MongoDB _id from luxestay.bookings
    guestName:     { type: String, required: true },
    guestEmail:    { type: String, required: true },
    hotelName:     { type: String },
    roomNumber:    { type: String },
    roomType:      { type: String },
    checkIn:       { type: Date },
    checkOut:      { type: Date },
    nights:        { type: Number },
    amount:        { type: Number, required: true },
    method:        { type: String, enum: ["card", "upi", "netbanking", "cash"], default: "card" },
    status:        { type: String, enum: ["Paid", "Pending", "Refunded", "Failed"], default: "Paid" },
  },
  { timestamps: true }
);

schema.index({ guestEmail: 1 });
schema.index({ createdAt: -1 });

export default (conn) => conn.model("Transaction", schema);
