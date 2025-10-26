import express from 'express';
import { createMemo, getUserMemos, markMemoAsRead, deleteMemo, getAllMemos, getMemosForUser, getMemoCount, createMemoForAllUsers, snoozeMemo, acknowledgeMemo, updateMemo, getMemosReadOverTime } from '../controllers/memo.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';
import { sanitizeInput } from '../middleware/sanitization.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { validateCreateMemo, validateObjectId, validatePagination } from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Memos
 *   description: Memo management endpoints
 */

// All routes require authentication
router.use(protectRoute);

/**
 * @swagger
 * /memos:
 *   post:
 *     summary: Create a new memo
 *     tags: [Memos]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - severity
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: "Important Meeting Tomorrow"
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *                 example: "Please attend the team meeting tomorrow at 10 AM"
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439011"]
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 example: "medium"
 *     responses:
 *       201:
 *         description: Memo created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Memo'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   get:
 *     summary: Get memos for current user
 *     tags: [Memos]
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
 *           default: 10
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Memos retrieved successfully
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
 *                         $ref: '#/components/schemas/Memo'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/', sanitizeInput, validateCreateMemo, asyncHandler(createMemo));
router.get('/', validatePagination, asyncHandler(getUserMemos));

/**
 * @swagger
 * /memos/all:
 *   get:
 *     summary: Get all memos in the system (Admin only)
 *     tags: [Memos]
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
 *           default: 10
 *     responses:
 *       200:
 *         description: All memos retrieved successfully
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
 *                         $ref: '#/components/schemas/Memo'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/all', authorize(['admin']), validatePagination, asyncHandler(getAllMemos));

/**
 * @swagger
 * /memos/count:
 *   get:
 *     summary: Get total memo count (Admin only)
 *     tags: [Memos]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Memo count retrieved successfully
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
 *                         count:
 *                           type: integer
 *                           example: 25
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get("/count", authorize(['admin']), asyncHandler(getMemoCount));

/**
 * @swagger
 * /memos/broadcast:
 *   post:
 *     summary: Create a memo and send to all users (Admin only)
 *     tags: [Memos]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - severity
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: "System Maintenance Notice"
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *                 example: "The system will be under maintenance from 2 AM to 4 AM tomorrow"
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 example: "high"
 *     responses:
 *       201:
 *         description: Broadcast memo created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Memo'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post('/broadcast', sanitizeInput, authorize(['admin']), validateCreateMemo, asyncHandler(createMemoForAllUsers));

/**
 * @swagger
 * /memos/user/{userId}:
 *   get:
 *     summary: Get all memos for a specific user (Admin only)
 *     tags: [Memos]
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
 *     responses:
 *       200:
 *         description: User memos retrieved successfully
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
 *                         $ref: '#/components/schemas/Memo'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/user/:userId', sanitizeInput, authorize(['admin']), validateObjectId('userId'), asyncHandler(getMemosForUser));

/**
 * @swagger
 * /memos/analytics/read:
 *   get:
 *     summary: Get memos read over time analytics (Admin only)
 *     tags: [Memos]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
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
 *                           period:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           date:
 *                             type: string
 *                             format: date
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/analytics/read', authorize(['admin']), asyncHandler(getMemosReadOverTime));

/**
 * @swagger
 * /memos/{memoId}/read:
 *   patch:
 *     summary: Mark a memo as read
 *     tags: [Memos]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: memoId
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Memo marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:memoId/read', sanitizeInput, validateObjectId('memoId'), asyncHandler(markMemoAsRead));

/**
 * @swagger
 * /memos/{memoId}/acknowledge:
 *   patch:
 *     summary: Acknowledge a memo
 *     tags: [Memos]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: memoId
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Memo acknowledged successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:memoId/acknowledge', sanitizeInput, validateObjectId('memoId'), asyncHandler(acknowledgeMemo));

/**
 * @swagger
 * /memos/{memoId}/snooze:
 *   patch:
 *     summary: Snooze a memo notification
 *     tags: [Memos]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: memoId
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
 *               snoozeUntil:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-12-31T10:00:00.000Z"
 *     responses:
 *       200:
 *         description: Memo snoozed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:memoId/snooze', sanitizeInput, validateObjectId('memoId'), asyncHandler(snoozeMemo));

/**
 * @swagger
 * /memos/{memoId}:
 *   put:
 *     summary: Update a memo
 *     tags: [Memos]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: memoId
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
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *     responses:
 *       200:
 *         description: Memo updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Memo'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Delete a memo
 *     tags: [Memos]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: memoId
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Memo deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put('/:memoId', sanitizeInput, validateObjectId('memoId'), asyncHandler(updateMemo));
router.delete('/:memoId', sanitizeInput, validateObjectId('memoId'), asyncHandler(deleteMemo));


export default router;
