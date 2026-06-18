import express from "express";
import { requestService } from "../controllers/serviceController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/request", protect, requestService);

export default router;
