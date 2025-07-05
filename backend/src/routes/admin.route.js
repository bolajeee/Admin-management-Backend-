import express from "express";
import { getSuggestedActions } from "../controllers/admin.controller.js";
import { protectRoute, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/suggested-actions", protectRoute, getSuggestedActions);

export default router;