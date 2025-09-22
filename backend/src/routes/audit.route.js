import express from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protectRoute, authorize(['admin']));

router.get('/', getAuditLogs);

export default router;
