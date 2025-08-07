import express from "express";
import { getUserSettings, updateUserSettings } from "../controllers/settings.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Get user settings
router.get("/", getUserSettings);

// Update user settings
router.put("/", updateUserSettings);

export default router;