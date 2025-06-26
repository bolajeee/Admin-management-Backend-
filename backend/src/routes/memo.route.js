import express from 'express';
import { createMemo, getUserMemos, markMemoAsRead, deleteMemo } from '../controllers/memo.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

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

export default router;
