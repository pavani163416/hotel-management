import express from "express";
import { getAllGuests, getGuestById, getAdditionalGuests } from "../controllers/guestController.js";

const router = express.Router();

router.get("/additional", getAdditionalGuests); // must be before /:id
router.get("/", getAllGuests);
router.get("/:id", getGuestById);

export default router;
