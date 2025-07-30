import express from 'express';
import {
    createTask,
    deleteTask,
    markTaskComplete,
    getTasks,
    getTaskCount,
    assignTask,
    updateTask,
    debugTaskSchema,
    getUserTasks,
    addTaskComment,
    getTaskComments,
    uploadTaskAttachment,
    listTaskAttachments,
    deleteTaskAttachment,
    linkMemoToTask,
    unlinkMemoFromTask,
    delegateTask,
    searchTasks,
    getTaskAuditLog
} from '../controllers/task.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// All routes require authentication
router.use(protectRoute);

// Create a new task
router.post('/', createTask);

// Get task count for dashboard
router.get('/count', getTaskCount);

// Get all tasks
router.get('/getTasks', getTasks);

// Get tasks for current user
router.get('/getUserTasks/:userId', getUserTasks);

// Update a task
router.patch('/:taskId/status', updateTask);

// Delete a task
router.delete('/:taskId', deleteTask);

// Mark a task as complete
router.patch('/:taskId/complete', markTaskComplete);

// Assign task to user
router.patch('/:taskId/assign/:userId', assignTask);

// General update endpoint (for status/priority/category)
router.patch('/:taskId', updateTask);

// Comments functionality
router.post('/:taskId/comments', addTaskComment);
router.get('/:taskId/comments', getTaskComments);

// Attachments functionality
router.post('/:taskId/attachments', upload.single('file'), uploadTaskAttachment);
router.get('/:taskId/attachments', listTaskAttachments);
router.delete('/:taskId/attachments/:attachmentId', deleteTaskAttachment);

// Memo linking
router.post('/:taskId/memos/:memoId', linkMemoToTask);
router.delete('/:taskId/memos/:memoId', unlinkMemoFromTask);

// Task delegation
router.patch('/:taskId/delegate', delegateTask);

// Advanced search
router.get('/search/advanced', searchTasks);

// Audit log
router.get('/:taskId/audit', getTaskAuditLog);

// Debug endpoint
router.get('/debug', protectRoute, authorize(['admin']), debugTaskSchema);

export default router;