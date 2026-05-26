/**
 * @swagger
 * tags:
 *   - name: Controller
 *     description: Controller DB and snapshot management endpoints
 * /api/controller/stats:
 *   get:
 *     summary: Get controller dashboard statistics
 *     tags: [Controller]
 *     responses:
 *       200:
 *         description: Controller stats returned
 * /api/controller/users:
 *   get:
 *     summary: List controller admin users
 *     tags: [Controller]
 *     responses:
 *       200:
 *         description: Controller users returned
 *   post:
 *     summary: Create a new controller admin user
 *     tags: [Controller]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: Controller user created
 * /api/controller/users/{id}:
 *   patch:
 *     summary: Update a controller admin user
 *     tags: [Controller]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Controller user updated
 * /api/controller/transactions:
 *   get:
 *     summary: List controller transactions
 *     tags: [Controller]
 *     responses:
 *       200:
 *         description: Transactions returned
 *   post:
 *     summary: Log a new controller transaction
 *     tags: [Controller]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaction logged
 * /api/controller/visitors:
 *   get:
 *     summary: List visitor logs tracked by the controller
 *     tags: [Controller]
 *     responses:
 *       200:
 *         description: Visitor logs returned
 * /api/controller/visitors/track:
 *   post:
 *     summary: Track a new visitor session
 *     tags: [Controller]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               page:
 *                 type: string
 *     responses:
 *       201:
 *         description: Visitor tracked
 * /api/controller/visitors/convert:
 *   patch:
 *     summary: Mark a visitor session as converted
 *     tags: [Controller]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Visitor session converted
 * /api/controller/visitors/{id}:
 *   patch:
 *     summary: Update a visitor log entry
 *     tags: [Controller]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Visitor log updated
 * /api/controller/hotels:
 *   get:
 *     summary: List controller hotel snapshots
 *     tags: [Controller]
 *     responses:
 *       200:
 *         description: Hotel snapshots returned
 *   post:
 *     summary: Create or update a hotel snapshot
 *     tags: [Controller]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Hotel'
 *     responses:
 *       201:
 *         description: Hotel snapshot saved
 * /api/controller/hotels/{id}:
 *   delete:
 *     summary: Delete a hotel snapshot by ID
 *     tags: [Controller]
 *     responses:
 *       200:
 *         description: Hotel snapshot deleted
 * /api/controller/rooms:
 *   get:
 *     summary: List controller room snapshots
 *     tags: [Controller]
 *     responses:
 *       200:
 *         description: Room snapshots returned
 *   post:
 *     summary: Create or update a room snapshot
 *     tags: [Controller]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       201:
 *         description: Room snapshot saved
 * /api/controller/rooms/{roomNumber}:
 *   delete:
 *     summary: Delete a room snapshot by room number
 *     tags: [Controller]
 *     parameters:
 *       - name: roomNumber
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room snapshot deleted
 */
import express from "express";
import {
  getAdminUsers, createAdminUser, updateAdminUser,
  getTransactions, createTransaction, updateTransaction,
  getVisitorLogs, createVisitorLog, updateVisitorLog, convertVisitorLog,
  getHotelSnapshots, upsertHotelSnapshot, deleteHotelSnapshot,
  getRoomSnapshots, upsertRoomSnapshot, deleteRoomSnapshot,
  getControllerStats,
} from "../controllers/controllerDbController.js";
import { protect, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

// Apply protection to ALL controller endpoints to prevent critical privilege escalation
router.use(protect);
router.use(authorizeRoles("admin", "Super Admin", "Controller"));

// Stats
router.get("/stats", getControllerStats);

// Admin Users  →  controller.adminusers
router.get("/users",       authorizeRoles("Super Admin", "admin"), getAdminUsers);
router.post("/users",      authorizeRoles("Super Admin"), createAdminUser);
router.patch("/users/:id", authorizeRoles("Super Admin"), updateAdminUser);

// Transactions  →  controller.transactions
router.get("/transactions",       authorizeRoles("Super Admin", "admin"), getTransactions);
router.post("/transactions",      authorizeRoles("Super Admin", "admin"), createTransaction);
router.patch("/transactions/:id", authorizeRoles("Super Admin", "admin"), updateTransaction);

// Visitor Logs  →  controller.visitorlogs
router.get("/visitors",          getVisitorLogs);
router.post("/visitors/track",   createVisitorLog);
router.patch("/visitors/convert",convertVisitorLog);
router.patch("/visitors/:id",    updateVisitorLog);

// Hotel Snapshots  →  controller.hotelsnapshots
router.get("/hotels",        getHotelSnapshots);
router.post("/hotels",       upsertHotelSnapshot);
router.delete("/hotels/:id", deleteHotelSnapshot);

// Room Snapshots  →  controller.rooms
router.get("/rooms",                    getRoomSnapshots);
router.post("/rooms",                   upsertRoomSnapshot);
router.delete("/rooms/:roomNumber",     deleteRoomSnapshot);

export default router;
