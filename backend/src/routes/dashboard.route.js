import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getDashboardStats, getRecentActivity } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/stats", protectRoute, getDashboardStats);
router.get("/recent-activity", protectRoute, getRecentActivity);

export default router;