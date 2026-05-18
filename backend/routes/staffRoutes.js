import express from "express";
import jwt from "jsonwebtoken";
import { staffLogin, getStaffTasks, updateStaffTaskStatus } from "../controllers/staffController.js";

const router = express.Router();

const verifyStaffToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    if (decoded.role !== "Housekeeper") return res.status(403).json({ success: false, message: "Not a housekeeper" });
    req.staff = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

router.post("/login", staffLogin);
router.get("/tasks", verifyStaffToken, getStaffTasks);
router.put("/tasks/:id/status", verifyStaffToken, updateStaffTaskStatus);

export default router;
