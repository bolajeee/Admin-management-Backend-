import express from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { validatePagination } from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Audit trail and logging endpoints (Admin only)
 */

// All routes require authentication and admin role
router.use(protectRoute, authorize(['admin']));

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get all audit logs with pagination (Admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action type (e.g., user_login, task_created, memo_sent)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter logs until this date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in action descriptions
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           user:
 *                             $ref: '#/components/schemas/User'
 *                           action:
 *                             type: string
 *                             example: "user_login"
 *                           description:
 *                             type: string
 *                             example: "User logged in successfully"
 *                           ipAddress:
 *                             type: string
 *                             example: "192.168.1.100"
 *                           userAgent:
 *                             type: string
 *                             example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
 *                           resourceType:
 *                             type: string
 *                             example: "user"
 *                           resourceId:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439011"
 *                           changes:
 *                             type: object
 *                             description: Object containing before/after values for updates
 *                           metadata:
 *                             type: object
 *                             description: Additional context-specific data
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           severity:
 *                             type: string
 *                             enum: [low, medium, high, critical]
 *                             example: "medium"
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/', validatePagination, asyncHandler(getAuditLogs));

export default router;
