import express from "express";
import { trackVisitor, updateVisitor, convertVisitor, getVisitors } from "../controllers/visitorController.js";

const router = express.Router();

router.post("/track",    trackVisitor);   // user panel → track page visit
router.patch("/convert", convertVisitor); // user panel → mark session as Converted
router.patch("/:id",     updateVisitor);  // user panel → update duration on leave
router.get("/",          getVisitors);    // admin panel → read all visitors

export default router;
