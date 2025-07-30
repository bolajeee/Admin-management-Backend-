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
} from '../controllers/task.controller.js';
import { protectRoute, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

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

// Add at the end of your routes
router.get('/debug', protectRoute, authorize(['admin']), debugTaskSchema);

export default router;