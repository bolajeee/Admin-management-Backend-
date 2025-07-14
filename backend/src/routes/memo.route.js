import express from 'express';
import { createMemo, getUserMemos, markMemoAsRead, deleteMemo, getAllMemos, getMemosForUser, getMemoCount, createMemoForAllUsers, snoozeMemo, acknowledgeMemo, updateMemo } from '../controllers/memo.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Create a new memo
router.post('/', createMemo);

// Get memos for current user
router.get('/', getUserMemos);

// Admin: Get all memos
router.get('/all', authorize(['admin']), getAllMemos);

// Mark memo as read
router.patch('/:memoId/read', markMemoAsRead);

// Delete memo
router.delete('/:memoId', deleteMemo);


// Admin: Get memos for a specific user
router.get('/user/:userId', authorize(['admin']), getMemosForUser);

// Admin: Get all memos
router.get("/count", authorize(['admin']), getMemoCount);

// Create memo for every user
router.post('/broadcast',  authorize(['admin']), createMemoForAllUsers);

// Mark memo as acknowledged
router.patch('/:memoId/acknowledge', acknowledgeMemo);

// Snooze memo
router.patch('/:memoId/snooze', snoozeMemo);

// Update memo (including status)
router.put('/:memoId', updateMemo);


export default router;
