import express from "express";
import {
  getAdminUsers, createAdminUser, updateAdminUser,
  getTransactions, createTransaction, updateTransaction,
  getVisitorLogs, createVisitorLog, updateVisitorLog, convertVisitorLog,
  getHotelSnapshots, upsertHotelSnapshot, deleteHotelSnapshot,
  getRoomSnapshots, upsertRoomSnapshot, deleteRoomSnapshot,
  getControllerStats,
} from "../controllers/controllerDbController.js";

const router = express.Router();

// Stats
router.get("/stats", getControllerStats);

// Admin Users  →  controller.adminusers
router.get("/users",       getAdminUsers);
router.post("/users",      createAdminUser);
router.patch("/users/:id", updateAdminUser);

// Transactions  →  controller.transactions
router.get("/transactions",       getTransactions);
router.post("/transactions",      createTransaction);
router.patch("/transactions/:id", updateTransaction);

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
