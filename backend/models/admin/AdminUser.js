import mongoose from "mongoose";

// Stored in: controller database
const schema = new mongoose.Schema(
  {
    name:              { type: String, required: true, trim: true },
    email:             { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:          { type: String, required: true },
    role:              { type: String, enum: ["Super Admin", "Manager", "Staff"], default: "Staff" },
    isActive:          { type: Boolean, default: true },
    lastLogin:         { type: Date },
    assignedHotelId:   { type: String, default: null },
    assignedHotelName: { type: String, default: null },
  },
  { timestamps: true }
);

// unique:true on email already creates an index — no need for schema.index()
// schema.index({ email: 1 });

// Model factory — bound to the admin connection
export default (conn) => conn.model("AdminUser", schema);
