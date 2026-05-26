import express from "express";
import {
  createPublicTicket,
  getAllPublicTickets,
  updateTicketStatus,
  getPublicTicketById
} from "../controllers/publicSupportController.js";
import { uploadPublicSupport } from "../middleware/uploadMiddleware.js";
import { protect, authorizeRoles } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiting for public ticket creation
const createTicketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per `window`
  message: "Too many support requests created from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

// PUBLIC ROUTE (No Auth required)
router.post(
  "/public/support/create",
  createTicketLimiter,
  uploadPublicSupport.array("attachments", 5),
  createPublicTicket
);

// ADMIN ROUTES (Protected)
router.get("/admin/public-support", protect, authorizeRoles("Super Admin", "admin"), getAllPublicTickets);
router.get("/admin/public-support/:id", protect, authorizeRoles("Super Admin", "admin"), getPublicTicketById);
router.patch("/admin/public-support/status/:id", protect, authorizeRoles("Super Admin", "admin"), updateTicketStatus);

export default router;
