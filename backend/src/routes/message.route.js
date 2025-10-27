import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js"
import { getEmployeeCount, getMessages, getRecentMessages, getTodayMessageCount, getUsers, sendMessage, getConversations, updateOnlineStatus } from "../controllers/message.controller.js"
import multer from 'multer';
import { sanitizeInput } from "../middleware/sanitization.middleware.js";
import { asyncHandler } from '../middleware/errorHandler.middleware.js';
import { validateSendMessage, validateObjectId, validatePagination } from '../middleware/validation.middleware.js';

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Real-time messaging system endpoints
 */

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

/**
 * @swagger
 * /messages/users:
 *   get:
 *     summary: Get list of all users to message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Users list retrieved successfully
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
 *                         $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/users", protectRoute, asyncHandler(getUsers));

/**
 * @swagger
 * /messages/userMessage/{id}:
 *   get:
 *     summary: Get conversation with a specific user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439011"
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
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
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
 *                           text:
 *                             type: string
 *                           image:
 *                             type: string
 *                           senderId:
 *                             $ref: '#/components/schemas/User'
 *                           receiverId:
 *                             $ref: '#/components/schemas/User'
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                             enum: [sent, delivered, read]
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/userMessage/:id", sanitizeInput, protectRoute, validateObjectId('id'), validatePagination, asyncHandler(getMessages));

/**
 * @swagger
 * /messages/user/{id}:
 *   post:
 *     summary: Send a message to a specific user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Hello, how are you doing?"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (max 5MB, jpg/png/gif only)
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Hello, how are you doing?"
 *               image:
 *                 type: string
 *                 format: url
 *                 example: "https://example.com/image.jpg"
 *     responses:
 *       201:
 *         description: Message sent successfully
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
 *                         _id:
 *                           type: string
 *                         text:
 *                           type: string
 *                         image:
 *                           type: string
 *                         senderId:
 *                           type: string
 *                         receiverId:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/user/:id', sanitizeInput, upload.single('image'), protectRoute, validateSendMessage, asyncHandler(sendMessage));

/**
 * @swagger
 * /messages/employees/count:
 *   get:
 *     summary: Get total number of employees
 *     tags: [Messages]
 *     responses:
 *       200:
 *         description: Employee count retrieved successfully
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
 *                           example: 15
 */
router.get("/employees/count", asyncHandler(getEmployeeCount));

/**
 * @swagger
 * /messages/recent:
 *   get:
 *     summary: Get recent messages for current user
 *     tags: [Messages]
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
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent messages retrieved successfully
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
 *                           text:
 *                             type: string
 *                           image:
 *                             type: string
 *                           senderId:
 *                             $ref: '#/components/schemas/User'
 *                           receiverId:
 *                             $ref: '#/components/schemas/User'
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/recent", protectRoute, asyncHandler(getRecentMessages));

/**
 * @swagger
 * /messages/today:
 *   get:
 *     summary: Get number of messages sent today
 *     tags: [Messages]
 *     responses:
 *       200:
 *         description: Today's message count retrieved successfully
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
 *                           example: 42
 *                         date:
 *                           type: string
 *                           format: date
 *                           example: "2024-01-01"
 */
router.get("/today", asyncHandler(getTodayMessageCount));

// New endpoints
router.get("/conversations", protectRoute, asyncHandler(getConversations));
router.patch("/online-status", protectRoute, asyncHandler(updateOnlineStatus));

export default router