import { body, validationResult } from "express-validator";

// ── Helper: run validation and return errors if any ──────
export const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

// ── Room validators ───────────────────────────────────────
export const validateRoom = [
  body("roomNumber")
    .trim()
    .notEmpty()
    .withMessage("Room number is required"),

  body("type")
    .isIn(["Deluxe", "Suite", "Standard", "Penthouse", "Villa"])
    .withMessage("Invalid room type"),

  body("pricePerNight")
    .isFloat({ min: 1 })
    .withMessage("Price must be a positive number"),

  body("capacity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Capacity must be at least 1"),

  handleValidation,
];

export const validateRoomStatus = [
  body("status")
    .isIn(["Available", "Booked", "Maintenance", "Cleaning", "Blocked"])
    .withMessage("Status must be Available, Booked, Maintenance, Cleaning, or Blocked"),

  handleValidation,
];

// ── Booking validators ────────────────────────────────────
export const validateBooking = [
  body("roomId")
    .notEmpty()
    .withMessage("Room ID is required"),

  body("guest.name")
    .trim()
    .notEmpty()
    .withMessage("Guest name is required")
    .isLength({ min: 2 })
    .withMessage("Name must be at least 2 characters"),

  body("guest.id")
    .trim()
    .notEmpty()
    .withMessage("Govt ID is required")
    .isLength({ min: 5, max: 20 })
    .withMessage("Govt ID must be between 5 and 20 characters")
    .matches(/^[a-zA-Z0-9\s-]+$/)
    .withMessage("Govt ID can only contain letters, numbers, spaces, and hyphens"),

  body("guest.email")
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("guest.phone")
    .optional({ checkFalsy: true })
    .trim(),

  body("additionalAdults")
    .optional()
    .isArray()
    .withMessage("Additional adults must be an array"),

  body("additionalAdults.*.id")
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage("Govt ID for additional adults must be between 5 and 20 characters")
    .matches(/^[a-zA-Z0-9\s-]+$/)
    .withMessage("Govt ID for additional adults can only contain letters, numbers, spaces, and hyphens"),

  body("additionalChildren")
    .optional()
    .isArray()
    .withMessage("Additional children must be an array"),

  body("additionalChildren.*.id")
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage("Govt ID for additional children must be between 5 and 20 characters")
    .matches(/^[a-zA-Z0-9\s-]+$/)
    .withMessage("Govt ID for additional children can only contain letters, numbers, spaces, and hyphens"),

  body("checkIn")
    .isISO8601()
    .withMessage("Check-in must be a valid date"),

  body("checkOut")
    .isISO8601()
    .withMessage("Check-out must be a valid date")
    .custom((checkOut, { req }) => {
      if (new Date(checkOut) <= new Date(req.body.checkIn)) {
        throw new Error("Check-out must be after check-in");
      }
      return true;
    }),

  body("guestCount")
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage("Guest count must be between 1 and 8")
    .custom((value, { req }) => {
      const additionalAdults = req.body.additionalAdults || [];
      const additionalChildren = req.body.additionalChildren || [];
      const total = 1 + additionalAdults.length + additionalChildren.length;
      if (total > 8) {
        throw new Error("Total guest count cannot exceed 8 persons");
      }
      return true;
    }),

  body("totalAmount")
    .isFloat({ min: 0 })
    .withMessage("Total amount must be a non-negative number"),

  body("pricePerNight")
    .isFloat({ min: 1 })
    .withMessage("Price per night must be a positive number"),

  handleValidation,
];
