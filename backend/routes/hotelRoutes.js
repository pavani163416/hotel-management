import express from "express";
import { getHotels, getHotelById, createHotel, updateHotel, deleteHotel, addRoomToHotel, removeRoomFromHotel, updateRoomInHotel, addReviewToHotel } from "../controllers/hotelController.js";

const router = express.Router();

router.route("/").get(getHotels).post(createHotel);
router.route("/:id").get(getHotelById).patch(updateHotel).delete(deleteHotel);
router.route("/:id/reviews").post(addReviewToHotel);
router.route("/:id/rooms").post(addRoomToHotel);
router.route("/:id/rooms/:roomId").patch(updateRoomInHotel).delete(removeRoomFromHotel);

export default router;
