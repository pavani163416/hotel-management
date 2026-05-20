/**
 * @swagger
 * tags:
 *   - name: Hotels
 *     description: Hotel CRUD and hotel room management endpoints
 * /api/hotels:
 *   get:
 *     summary: List all hotels
 *     tags: [Hotels]
 *     responses:
 *       200:
 *         description: Hotel list returned
 *   post:
 *     summary: Create a new hotel
 *     tags: [Hotels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Hotel'
 *     responses:
 *       201:
 *         description: Hotel created successfully
 * /api/hotels/{id}:
 *   get:
 *     summary: Get hotel details by ID
 *     tags: [Hotels]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Hotel details returned
 *   patch:
 *     summary: Update hotel details by ID
 *     tags: [Hotels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Hotel'
 *     responses:
 *       200:
 *         description: Hotel updated successfully
 *   delete:
 *     summary: Delete a hotel by ID
 *     tags: [Hotels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hotel deleted successfully
 * /api/hotels/{id}/reviews:
 *   post:
 *     summary: Add a review to a hotel
 *     tags: [Hotels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review added successfully
 * /api/hotels/{id}/rooms:
 *   post:
 *     summary: Add a room to a hotel
 *     tags: [Hotels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ManagerRoom'
 *     responses:
 *       201:
 *         description: Room added successfully
 * /api/hotels/{id}/rooms/{roomId}:
 *   patch:
 *     summary: Update a specific room in a hotel
 *     tags: [Hotels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ManagerRoom'
 *     responses:
 *       200:
 *         description: Room updated successfully
 *   delete:
 *     summary: Remove a room from a hotel
 *     tags: [Hotels]
 *     responses:
 *       200:
 *         description: Room removed successfully
 */
import express from "express";
import { getHotels, getHotelById, createHotel, updateHotel, deleteHotel, addRoomToHotel, removeRoomFromHotel, updateRoomInHotel, addReviewToHotel } from "../controllers/hotelController.js";

const router = express.Router();

router.route("/").get(getHotels).post(createHotel);
router.route("/:id").get(getHotelById).patch(updateHotel).delete(deleteHotel);
router.route("/:id/reviews").post(addReviewToHotel);
router.route("/:id/rooms").post(addRoomToHotel);
router.route("/:id/rooms/:roomId").patch(updateRoomInHotel).delete(removeRoomFromHotel);

export default router;
