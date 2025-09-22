import express from 'express';
import { createMemo, getUserMemos, markMemoAsRead, deleteMemo, getAllMemos, getMemosForUser, getMemoCount, createMemoForAllUsers, snoozeMemo, acknowledgeMemo, updateMemo, getMemosReadOverTime } from '../controllers/memo.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';
import { sanitizeInput } from '../middleware/sanitization.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Create a new memo
router.post('/', sanitizeInput, createMemo);

// Get memos for current user
router.get('/', getUserMemos);

// Admin: Get all memos
router.get('/all', authorize(['admin']), getAllMemos);

// Mark memo as read
router.patch('/:memoId/read', sanitizeInput, markMemoAsRead);

// Delete memo
router.delete('/:memoId', sanitizeInput, deleteMemo);


// Admin: Get memos for a specific user
router.get('/user/:userId', sanitizeInput, authorize(['admin']), getMemosForUser);

// Admin: Get all memos
router.get("/count", authorize(['admin']), getMemoCount);

// Create memo for every user
router.post('/broadcast', sanitizeInput, authorize(['admin']), createMemoForAllUsers);

// Mark memo as acknowledged
router.patch('/:memoId/acknowledge', sanitizeInput, acknowledgeMemo);

// Snooze memo
router.patch('/:memoId/snooze', sanitizeInput, snoozeMemo);

// Update memo (including status)
router.put('/:memoId', sanitizeInput, updateMemo);

// Analytics: memos read over time (admin only)
router.get('/analytics/read', authorize(['admin']), getMemosReadOverTime);


export default router;
