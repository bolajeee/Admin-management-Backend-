import express from 'express';
import {
    createTask, getTasks, updateTaskStatus, deleteTask, getTaskCount,
    addTaskComment, getTaskComments,
    uploadTaskAttachment, listTaskAttachments, deleteTaskAttachment,
    updateTaskRecurrence, getTaskNextOccurrence,
    linkMemoToTask, unlinkMemoFromTask,
    updateTaskCategory,
    getTaskAuditLog,
    delegateTask,
    searchTasks
} from '../controllers/task.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Create a new task
router.post('/', createTask);

// Get all tasks (with optional filters)
router.get('/', getTasks);

// Get tasks for a specific user
router.get('/userTasks/:userId', getTasks);

// Update task status
router.patch('/:taskId/status', updateTaskStatus);

// Delete task
router.delete('/:taskId', deleteTask);

// Admin: Get task count
router.get('/count', getTaskCount);

// --- Advanced Task Features ---

// Comments
router.post('/:taskId/comments', addTaskComment);
router.get('/:taskId/comments', getTaskComments);

// Attachments
router.post('/:taskId/attachments', uploadTaskAttachment);
router.get('/:taskId/attachments', listTaskAttachments);
router.delete('/:taskId/attachments/:attachmentId', deleteTaskAttachment);

// Recurrence
router.patch('/:taskId/recurrence', updateTaskRecurrence);
router.get('/:taskId/next-occurrence', getTaskNextOccurrence);

// Memo linking
router.post('/:taskId/memos/:memoId', linkMemoToTask);
router.delete('/:taskId/memos/:memoId', unlinkMemoFromTask);

// Category
router.patch('/:taskId/category', updateTaskCategory);

// Audit log
router.get('/:taskId/audit', getTaskAuditLog);

// Delegation
router.patch('/:taskId/delegate', delegateTask);

// Advanced search
router.get('/search/advanced', searchTasks);

export default router;
