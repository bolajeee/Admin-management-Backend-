import express from "express";
import { getUserSettings, updateUserSettings, getSystemSettings, updateSystemSettings } from "../controllers/settings.controller.js";
import { protectRoute, authorize } from "../middleware/auth.middleware.js";
import { sanitizeInput } from "../middleware/sanitization.middleware.js";
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { validateObjectId } from '../middleware/validation.middleware.js';

import { settingsRateLimiter } from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: User and system settings management endpoints
 */

// Apply rate limiting to all settings routes
router.use(settingsRateLimiter);

// All routes require authentication
router.use(protectRoute);

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get current user's settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User settings retrieved successfully
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
 *                         notifications:
 *                           type: object
 *                           properties:
 *                             email:
 *                               type: boolean
 *                               example: true
 *                             sms:
 *                               type: boolean
 *                               example: false
 *                             push:
 *                               type: boolean
 *                               example: true
 *                             taskAssignments:
 *                               type: boolean
 *                               example: true
 *                             memoAlerts:
 *                               type: boolean
 *                               example: true
 *                             messageAlerts:
 *                               type: boolean
 *                               example: false
 *                         privacy:
 *                           type: object
 *                           properties:
 *                             showOnlineStatus:
 *                               type: boolean
 *                               example: true
 *                             allowDirectMessages:
 *                               type: boolean
 *                               example: true
 *                             shareActivityStatus:
 *                               type: boolean
 *                               example: false
 *                         preferences:
 *                           type: object
 *                           properties:
 *                             theme:
 *                               type: string
 *                               enum: [light, dark, auto]
 *                               example: "light"
 *                             language:
 *                               type: string
 *                               example: "en"
 *                             timezone:
 *                               type: string
 *                               example: "UTC"
 *                             dateFormat:
 *                               type: string
 *                               example: "MM/DD/YYYY"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   patch:
 *     summary: Update current user's settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notifications:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                   sms:
 *                     type: boolean
 *                   push:
 *                     type: boolean
 *                   taskAssignments:
 *                     type: boolean
 *                   memoAlerts:
 *                     type: boolean
 *                   messageAlerts:
 *                     type: boolean
 *               privacy:
 *                 type: object
 *                 properties:
 *                   showOnlineStatus:
 *                     type: boolean
 *                   allowDirectMessages:
 *                     type: boolean
 *                   shareActivityStatus:
 *                     type: boolean
 *               preferences:
 *                 type: object
 *                 properties:
 *                   theme:
 *                     type: string
 *                     enum: [light, dark, auto]
 *                   language:
 *                     type: string
 *                   timezone:
 *                     type: string
 *                   dateFormat:
 *                     type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       description: Updated settings object
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", asyncHandler(getUserSettings));
router.patch("/", sanitizeInput, asyncHandler(updateUserSettings));

/**
 * @swagger
 * /settings/{userId}:
 *   patch:
 *     summary: Update settings for any user (Admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notifications:
 *                 type: object
 *               privacy:
 *                 type: object
 *               preferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: User settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch("/:userId", authorize(['admin']), sanitizeInput, validateObjectId('userId'), asyncHandler(updateUserSettings));

/**
 * @swagger
 * /settings/system:
 *   get:
 *     summary: Get system settings (Admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: System settings retrieved successfully
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
 *                         general:
 *                           type: object
 *                           properties:
 *                             siteName:
 *                               type: string
 *                               example: "Admin Management System"
 *                             siteDescription:
 *                               type: string
 *                               example: "Comprehensive admin management platform"
 *                             maintenanceMode:
 *                               type: boolean
 *                               example: false
 *                             allowRegistration:
 *                               type: boolean
 *                               example: false
 *                         security:
 *                           type: object
 *                           properties:
 *                             passwordMinLength:
 *                               type: integer
 *                               example: 6
 *                             requirePasswordComplexity:
 *                               type: boolean
 *                               example: true
 *                             sessionTimeout:
 *                               type: integer
 *                               example: 3600
 *                             maxLoginAttempts:
 *                               type: integer
 *                               example: 5
 *                         notifications:
 *                           type: object
 *                           properties:
 *                             emailEnabled:
 *                               type: boolean
 *                               example: true
 *                             smsEnabled:
 *                               type: boolean
 *                               example: false
 *                             defaultNotifications:
 *                               type: object
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   patch:
 *     summary: Update system settings (Admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               general:
 *                 type: object
 *                 properties:
 *                   siteName:
 *                     type: string
 *                   siteDescription:
 *                     type: string
 *                   maintenanceMode:
 *                     type: boolean
 *                   allowRegistration:
 *                     type: boolean
 *               security:
 *                 type: object
 *                 properties:
 *                   passwordMinLength:
 *                     type: integer
 *                     minimum: 4
 *                     maximum: 128
 *                   requirePasswordComplexity:
 *                     type: boolean
 *                   sessionTimeout:
 *                     type: integer
 *                     minimum: 300
 *                     maximum: 86400
 *                   maxLoginAttempts:
 *                     type: integer
 *                     minimum: 3
 *                     maximum: 10
 *               notifications:
 *                 type: object
 *                 properties:
 *                   emailEnabled:
 *                     type: boolean
 *                   smsEnabled:
 *                     type: boolean
 *                   defaultNotifications:
 *                     type: object
 *     responses:
 *       200:
 *         description: System settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get("/system", authorize(['admin']), asyncHandler(getSystemSettings));
router.patch("/system", authorize(['admin']), sanitizeInput, asyncHandler(updateSystemSettings));

export default router;