import express from 'express';
import { createMemo, getUserMemos, markMemoAsRead, deleteMemo, getAllMemos, getMemosForUser } from '../controllers/memo.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Create a new memo
router.post('/', createMemo);

// Get memos for current user
router.get('/', getUserMemos);

// Mark memo as read
router.patch('/:memoId/read', markMemoAsRead);

// Delete memo
router.delete('/:memoId', deleteMemo);


// protected routes

// Admin: Get all memos
router.get('/all', authorize(['admin']), getAllMemos);

// Admin: Get memos for a specific user
router.get('/user/:userId', authorize(['admin']), getMemosForUser);


export default router;
