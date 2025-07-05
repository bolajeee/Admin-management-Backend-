import express from 'express';
import { createTask, getTasks, updateTaskStatus, deleteTask, getTaskCount } from '../controllers/task.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Create a new task
router.post('/', createTask);

// Get all tasks (with optional filters)
router.get('/', getTasks);

// Update task status
router.patch('/:taskId/status', updateTaskStatus);

// Delete task
router.delete('/:taskId', deleteTask);

// Admin: Get task count
router.get('/count', getTaskCount);

export default router;
