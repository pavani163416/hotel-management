/**
 * zodValidation.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Enterprise-grade Zod validation middleware.
 *
 * Usage:
 *   import { validate, schemas } from "../middleware/zodValidation.js";
 *   router.post("/login", validate(schemas.login), loginHandler);
 *
 * Security:
 *   - .strict() strips all unknown/unexpected keys → prevents NoSQL injection
 *   - All inputs validated server-side before hitting any controller
 *   - Returns structured 422 on failure (never leaks stack traces)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { z } from "zod";

// ── Generic validate middleware factory ──────────────────────────────────────
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field:   e.path.join("."),
        message: e.message,
      }));
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }
    // Replace req[source] with the parsed (stripped) data
    req[source] = result.data;
    next();
  };
};

// ── Shared field definitions ─────────────────────────────────────────────────
const emailField       = z.string().email("Invalid email address").toLowerCase().trim();
const passwordField    = z.string().min(8, "Password must be at least 8 characters").max(72, "Password too long");
const nameField        = z.string().min(2, "Name must be at least 2 characters").max(100).trim();
const phoneField       = z.string()
  .trim()
  .refine((val) => {
    if (!val) return true;
    const clean = val.replace(/[\s\-()]/g, "").replace(/^\+/, "");
    if (!/^\d+$/.test(clean)) return false;
    if (clean.length < 7 || clean.length > 15) return false;
    if (clean.length === 10) {
      return /^[6-9]/.test(clean);
    }
    if (clean.startsWith("91")) {
      const localPart = clean.slice(2);
      return localPart.length === 10 && /^[6-9]/.test(localPart);
    }
    return true;
  }, {
    message: "Invalid phone number. Indian numbers must be 10 digits starting with 6-9."
  })
  .optional()
  .or(z.literal(""));
const mongoIdField     = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format");
const dateField        = z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date format");
const positiveInt      = z.number().int().positive();
const positiveNumber   = z.number().positive();
// ── Auth Schemas ─────────────────────────────────────────────────────────────
const login = z.object({
  email:    emailField,
  password: z.string().min(1, "Password is required").max(72),
}).strict();

const register = z.object({
  name:     nameField,
  email:    emailField,
  password: passwordField,
  phone:    phoneField,
}).strict();

const changePassword = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword:     passwordField,
}).strict();

// ── Booking Schemas ──────────────────────────────────────────────────────────
const createBooking = z.object({
  roomId:        mongoIdField.optional(),
  room:          mongoIdField.optional(),
  hotelId:       z.string().max(50).optional(),
  hotelStringId: z.string().max(50).optional(),
  checkIn:       dateField,
  checkOut:      dateField,
  guests:        z.number().int().min(1).max(20).optional(),
  // Guest snapshot for non-logged-in bookings
  guestSnapshot: z.object({
    name:  nameField,
    email: emailField,
    phone: phoneField,
  }).optional(),
  // Payment / promo
  promoCode:    z.string().max(50).trim().optional(),
  paymentMode:  z.enum(["card", "upi", "cash", "bank_transfer", "online"]).optional(),
  specialRequests: z.string().max(500).trim().optional(),
}).strict().refine(
  (d) => d.roomId || d.room,
  { message: "roomId is required", path: ["roomId"] }
).refine(
  (d) => new Date(d.checkIn) < new Date(d.checkOut),
  { message: "checkOut must be after checkIn", path: ["checkOut"] }
);

const cancelBooking = z.object({
  reason: z.string().max(300).trim().optional(),
}).strict();

// ── Walk-in Booking (Manager) Schema ─────────────────────────────────────────
const walkInBooking = z.object({
  roomId:          mongoIdField.optional(),
  room:            mongoIdField.optional(),
  checkIn:         dateField,
  checkOut:        dateField,
  guests:          z.number().int().min(1).max(20).optional(),
  guestName:       nameField,
  guestEmail:      emailField.optional(),
  guestPhone:      phoneField,
  paymentMode:     z.enum(["card", "upi", "cash", "bank_transfer"]).optional(),
  specialRequests: z.string().max(500).trim().optional(),
}).strict().refine(
  (d) => new Date(d.checkIn) < new Date(d.checkOut),
  { message: "checkOut must be after checkIn", path: ["checkOut"] }
);

// ── Hotel Schemas ─────────────────────────────────────────────────────────────
const createHotel = z.object({
  hotelId:       z.string().min(2).max(50).trim(),
  name:          z.string().min(2).max(200).trim(),
  location:      z.string().max(300).trim(),
  city:          z.string().max(100).trim(),
  country:       z.string().max(100).trim().optional(),
  description:   z.string().max(2000).trim().optional(),
  image:         z.string().url().optional(),
  gallery:       z.array(z.string().url().max(1000)).max(20).optional(),
  rating:        z.number().min(0).max(5).optional(),
  reviewCount:   z.number().int().min(0).optional(),
  pricePerNight: positiveNumber,
  type:          z.enum(["Hotel", "Resort", "Villa", "Suite"]).optional(),
  coords:        z.array(z.number()).length(2).optional(),
  amenities:     z.array(z.string().max(100)).max(50).optional(),
  rooms:         z.array(z.object({
    id:          z.string().max(100).trim(),
    name:        z.string().max(200).trim(),
    description: z.string().max(1000).trim().optional(),
    price:       positiveNumber,
    capacity:    positiveInt.optional(),
    bed:         z.string().max(100).trim().optional(),
    available:   z.number().int().nonnegative().optional(),
    features:    z.array(z.string().max(100)).max(50).optional(),
  })).optional(),
  roomInventory: z.record(
    z.object({
      total: z.number().int().nonnegative(),
      price: z.number().nonnegative(),
    })
  ).optional(),
  reviews:       z.array(z.object({
    author:  z.string().max(200).trim(),
    rating:  z.number().min(1).max(5),
    comment: z.string().max(1000).trim().optional(),
    date:    z.string().max(100).optional(),
  })).optional(),
  floors:        positiveInt.optional(),
  roomsPerFloor: positiveInt.optional(),
  totalRooms:    positiveInt.optional(),
  status:        z.enum(["Active", "Inactive", "Maintenance"]).optional(),
  isActive:      z.boolean().optional(),
}).strict();

const updateHotel = z.object({
  hotelId:       z.string().min(2).max(50).trim().optional(),
  name:          z.string().min(2).max(200).trim().optional(),
  location:      z.string().max(300).trim().optional(),
  city:          z.string().max(100).trim().optional(),
  country:       z.string().max(100).trim().optional(),
  description:   z.string().max(2000).trim().optional(),
  image:         z.string().url().optional(),
  gallery:       z.array(z.string().url().max(1000)).max(20).optional(),
  rating:        z.number().min(0).max(5).optional(),
  reviewCount:   z.number().int().min(0).optional(),
  pricePerNight: positiveNumber.optional(),
  type:          z.enum(["Hotel", "Resort", "Villa", "Suite"]).optional(),
  coords:        z.array(z.number()).length(2).optional(),
  amenities:     z.array(z.string().max(100)).max(50).optional(),
  roomInventory: z.record(
    z.object({
      total: z.number().int().nonnegative(),
      price: z.number().nonnegative(),
    })
  ).optional(),
  floors:        positiveInt.optional(),
  roomsPerFloor: positiveInt.optional(),
  totalRooms:    positiveInt.optional(),
  status:        z.enum(["Active", "Inactive", "Maintenance"]).optional(),
  isActive:      z.boolean().optional(),
}).strict();

// ── Room Schemas ──────────────────────────────────────────────────────────────
const createRoom = z.object({
  roomNumber:    z.string().min(1).max(50).trim(),
  type:          z.enum(["Standard", "Deluxe", "Suite", "Penthouse", "Villa"]).optional(),
  bedType:       z.enum(["Single", "Double", "Queen", "King", "Twin"]).optional(),
  pricePerNight: positiveNumber,
  capacity:      positiveInt,
  description:   z.string().max(1000).trim().optional(),
  amenities:     z.array(z.string().max(100)).max(50).optional(),
  status:        z.enum(["Available", "Booked", "Maintenance", "Blocked"]).optional(),
}).strict();

const updateRoom = z.object({
  type:          z.enum(["Standard", "Deluxe", "Suite", "Penthouse", "Villa"]).optional(),
  bedType:       z.enum(["Single", "Double", "Queen", "King", "Twin"]).optional(),
  pricePerNight: positiveNumber.optional(),
  capacity:      positiveInt.optional(),
  description:   z.string().max(1000).trim().optional(),
  amenities:     z.array(z.string().max(100)).max(50).optional(),
  status:        z.enum(["Available", "Booked", "Maintenance", "Blocked"]).optional(),
}).strict();

// ── Price Request Schema ──────────────────────────────────────────────────────
const createPriceRequest = z.object({
  roomId:           mongoIdField,
  requestedPrice:   positiveNumber,
  reason:           z.string().max(500).trim().optional(),
}).strict();

// ── Review Schema ─────────────────────────────────────────────────────────────
const addReview = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().min(5, "Comment must be at least 5 characters").max(1000).trim(),
}).strict();

const editReview = z.object({
  rating:  z.number().int().min(1).max(5).optional(),
  comment: z.string().min(5, "Comment must be at least 5 characters").max(1000).trim().optional(),
}).strict().refine((d) => d.rating != null || d.comment != null, {
  message: "Rating or comment is required",
});

// ── Manager Login Schema (same as user login but exported separately) ─────────
const managerLogin = z.object({
  email:    emailField,
  password: z.string().min(1).max(72),
}).strict();

// ── Exported schemas map ──────────────────────────────────────────────────────
export const schemas = {
  login,
  register,
  changePassword,
  createBooking,
  cancelBooking,
  walkInBooking,
  createHotel,
  updateHotel,
  createRoom,
  updateRoom,
  createPriceRequest,
  addReview,
  editReview,
  managerLogin,
};
