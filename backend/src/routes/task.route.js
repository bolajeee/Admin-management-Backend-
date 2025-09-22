import express from 'express';
import {
    createTask,
    deleteTask,
    getTasks,
    getTaskCount,
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
    getTaskAuditLog,
    getTasksCompletedOverTime
} from '../controllers/task.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';
import { sanitizeInput } from '../middleware/sanitization.middleware.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for secure file uploads
const upload = multer({
  storage: multer.diskStorage({}), // Use disk storage to avoid memory exhaustion
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  },
});

// All routes require authentication
router.use(protectRoute);

// Create a new task
router.post('/', sanitizeInput, createTask);

// Get task count for dashboard
router.get('/count', getTaskCount);

// Get all tasks
router.get('/', getTasks);

// Get tasks for current user
router.get('/getUserTasks/:userId', sanitizeInput, getUserTasks);

// Update a task
router.patch('/:taskId', sanitizeInput, protectRoute, updateTask);

// Delete a task
router.delete('/:taskId', sanitizeInput, protectRoute, deleteTask);

// Comments functionality
router.post('/:taskId/comments', sanitizeInput, addTaskComment);
router.get('/:taskId/comments', sanitizeInput, getTaskComments);

// Attachments functionality
router.post('/:taskId/attachments', sanitizeInput, upload.single('file'), uploadTaskAttachment);
router.get('/:taskId/attachments', sanitizeInput, listTaskAttachments);
router.delete('/:taskId/attachments/:attachmentId', sanitizeInput, deleteTaskAttachment);

// Memo linking
router.post('/:taskId/memos/:memoId', sanitizeInput, linkMemoToTask);
router.delete('/:taskId/memos/:memoId', sanitizeInput, unlinkMemoFromTask);

// Task delegation
router.patch('/:taskId/delegate', sanitizeInput, delegateTask);

// Advanced search
router.get('/search/advanced', searchTasks);

// Audit log
router.get('/:taskId/audit', sanitizeInput, getTaskAuditLog);

// Analytics: tasks completed over time (admin only)
router.get('/analytics/completed', authorize(['admin']), getTasksCompletedOverTime);

// Debug endpoint
router.get('/debug', protectRoute, authorize(['admin']), debugTaskSchema);

export default router;