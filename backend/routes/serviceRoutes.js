import express from "express";
import { requestService } from "../controllers/serviceController.js";
import { verifyCustomerToken } from "../middleware/customerAuth.js";

const router = express.Router();

router.post("/request", verifyCustomerToken, requestService);

export default router;
