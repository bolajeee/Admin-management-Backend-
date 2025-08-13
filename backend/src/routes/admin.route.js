import express from "express";
import { getSuggestedActions } from "../controllers/admin.controller.js";
import { protectRoute, authorize } from "../middleware/auth.middleware.js";
import { toggleUserActive, resetUserPassword, deleteUser, getUserStats } from '../controllers/auth.controller.js';

const router = express.Router();

router.get("/suggested-actions", protectRoute, getSuggestedActions);
router.patch('/users/:id/toggle-active', protectRoute, authorize(['admin']), toggleUserActive);
router.post('/users/:id/reset-password', protectRoute, authorize(['admin']), resetUserPassword);
router.delete('/users/:id', protectRoute, authorize(['admin']), deleteUser);
router.get('/users/:id/stats', protectRoute, authorize(['admin']), getUserStats);

export default router;