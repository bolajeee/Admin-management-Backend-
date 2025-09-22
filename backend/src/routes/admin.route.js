import express from "express";
import { getSuggestedActions } from "../controllers/admin.controller.js";
import { protectRoute, authorize } from "../middleware/auth.middleware.js";
import { toggleUserActive, resetUserPassword, deleteUser, getUserStats } from '../controllers/auth.controller.js';
import { sanitizeInput } from "../middleware/sanitization.middleware.js";

const router = express.Router();

router.get("/suggested-actions", protectRoute, getSuggestedActions);
router.patch('/users/:id/toggle-active', sanitizeInput, protectRoute, authorize(['admin']), toggleUserActive);
router.post('/users/:id/reset-password', sanitizeInput, protectRoute, authorize(['admin']), resetUserPassword);
router.delete('/users/:id', sanitizeInput, protectRoute, authorize(['admin']), deleteUser);
router.get('/users/:id/stats', sanitizeInput, protectRoute, authorize(['admin']), getUserStats);

export default router;