import express from "express";
import { getUserSettings, updateUserSettings, getSystemSettings, updateSystemSettings } from "../controllers/settings.controller.js";
import { protectRoute, authorize } from "../middleware/auth.middleware.js";
import { sanitizeInput } from "../middleware/sanitization.middleware.js";

import { settingsRateLimiter } from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

// Apply rate limiting to all settings routes
router.use(settingsRateLimiter);


// All routes require authentication
router.use(protectRoute);

// Get user settings
router.get("/", getUserSettings);

// Update user settings (partial updates)
router.patch("/", sanitizeInput, updateUserSettings);

// Admin: Update settings for any user
router.patch("/:userId", authorize(['admin']), sanitizeInput, updateUserSettings);

// Get system settings (admin only)
router.get("/system", authorize(['admin']), getSystemSettings);

// Update system settings (admin only, partial updates)
router.patch("/system", authorize(['admin']), sanitizeInput, updateSystemSettings);

export default router;