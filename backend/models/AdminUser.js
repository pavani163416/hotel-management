import mongoose from "mongoose";

// ── Admin Panel Users — stored in the 'luxestay' database ──
const adminUserSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true, trim: true },
    email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:        { type: String, required: true },   // hashed
    role:            { type: String, enum: ["Super Admin", "Manager", "Staff"], default: "Staff" },
    isActive:        { type: Boolean, default: true },
    lastLogin:       { type: Date },
    resetPasswordToken:   { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    // ── Multi-tenant: hotel assignment for Manager role ──
    // assignedHotelId: string key like "h1", "h2" (legacy / seeded)
    assignedHotelId: {
      type: String,
      default: null,
    },
    assignedHotelName: {
      type: String,
      default: null,
    },
    // hotelObjectId: MongoDB ObjectId reference to Hotel document
    // Used for proper DB-level joins and new hotel assignments
    hotelObjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },
  },
  { timestamps: true }
);

const AdminUser = mongoose.model("AdminUser", adminUserSchema);
export default AdminUser;
