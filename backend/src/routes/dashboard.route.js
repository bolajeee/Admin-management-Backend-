import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getDashboardStats, getRecentActivity } from "../controllers/dashboard.controller.js";
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { validatePagination } from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics and activity endpoints
 */

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Get key statistics for the dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                           example: 25
 *                         activeUsers:
 *                           type: integer
 *                           example: 20
 *                         totalTasks:
 *                           type: integer
 *                           example: 150
 *                         completedTasks:
 *                           type: integer
 *                           example: 120
 *                         pendingTasks:
 *                           type: integer
 *                           example: 30
 *                         totalMemos:
 *                           type: integer
 *                           example: 45
 *                         unreadMemos:
 *                           type: integer
 *                           example: 12
 *                         totalMessages:
 *                           type: integer
 *                           example: 500
 *                         todayMessages:
 *                           type: integer
 *                           example: 25
 *                         totalReports:
 *                           type: integer
 *                           example: 8
 *                         totalTeams:
 *                           type: integer
 *                           example: 5
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/stats", protectRoute, asyncHandler(getDashboardStats));

/**
 * @swagger
 * /dashboard/recent-activity:
 *   get:
 *     summary: Get a feed of recent activities
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [task, memo, message, user, team]
 *         description: Filter by activity type
 *     responses:
 *       200:
 *         description: Recent activities retrieved successfully
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
 *                           type:
 *                             type: string
 *                             enum: [task_created, task_completed, memo_sent, user_login, message_sent]
 *                           description:
 *                             type: string
 *                             example: "John Doe completed task 'Update documentation'"
 *                           user:
 *                             $ref: '#/components/schemas/User'
 *                           relatedId:
 *                             type: string
 *                             description: ID of related resource (task, memo, etc.)
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           metadata:
 *                             type: object
 *                             description: Additional activity-specific data
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/recent-activity", protectRoute, validatePagination, asyncHandler(getRecentActivity));

export default router;