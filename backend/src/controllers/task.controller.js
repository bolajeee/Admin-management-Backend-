import Task from '../models/task.model.js';
import mongoose from 'mongoose';

// Create a new task
export const createTask = async (req, res) => {
    try {
        const { title, description, assignedTo, priority, dueDate } = req.body;
        const task = new Task({
            title,
            description,
            assignedTo,
            priority,
            dueDate,
            createdBy: req.user._id
        });

        await task.save();

        // Populate creator and assignees
        await task.populate(['createdBy', 'assignedTo']);

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all tasks (with filters)
export const getTasks = async (req, res) => {
    try {
        const { status, priority, assignedTo } = req.query;
        const filter = {};

        if (status && status !== '') filter.status = status;
        if (priority && priority !== '') filter.priority = priority;
        if (assignedTo && assignedTo !== '') filter.assignedTo = assignedTo;

        const tasks = await Task.find(filter)
            .populate(['createdBy', 'assignedTo'])
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get tasks for a specific user
export const getTasksForUser = async (req, res) => {
    const userId = req.params.userId;
    const { status, priority, severity } = req.query;

    try {
        const filter = { assignedTo: userId };

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (severity) filter.severity = severity;

        const tasks = await Task.find(filter)
            .populate(['createdBy', 'assignedTo'])
            .sort({ createdAt: -1 });

        res.status(200).json(tasks);
    } catch (error) {
        console.error("Error fetching user-specific tasks:", error);
        res.status(500).json({ error: "Failed to fetch tasks for user." });
    }
};

// Update task status
export const updateTaskStatus = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;

        const task = await Task.findByIdAndUpdate(
            taskId,
            { status },
            { new: true }
        ).populate(['createdBy', 'assignedTo']);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete task
export const deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await Task.findByIdAndDelete(taskId);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//Get task count
export const getTaskCount = async (req, res) => {
    try {
        const count = await Task.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

// --- Advanced Task Features ---

// Add a comment to a task
export const addTaskComment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { comment } = req.body;
        const userId = req.user?._id || req.body.user; // fallback for testing
        if (!comment) return res.status(400).json({ error: 'Comment required' });
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        const newComment = {
            user: userId,
            action: 'commented',
            comment,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        task.activity.push(newComment);
        await task.save();
        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get comments for a task
export const getTaskComments = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        // Filter activity for comments
        const comments = (task.activity || []).filter(a => a.action === 'commented').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Upload attachment to a task (mock: accept file info in req.body)
export const uploadTaskAttachment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { url, name, type, size } = req.body;
        const userId = req.user?._id || req.body.user; // fallback for testing
        if (!url || !name) return res.status(400).json({ error: 'File info required' });
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        const newAttachment = {
            url, name, type, size,
            uploadedBy: userId,
            uploadedAt: new Date(),
            _id: new mongoose.Types.ObjectId()
        };
        task.attachments.push(newAttachment);
        await task.save();
        res.status(201).json(newAttachment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// List attachments for a task
export const listTaskAttachments = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        res.json(task.attachments || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete attachment from a task
export const deleteTaskAttachment = async (req, res) => {
    try {
        const { taskId, attachmentId } = req.params;
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        task.attachments = (task.attachments || []).filter(a => String(a._id) !== String(attachmentId));
        await task.save();
        res.json({ message: 'Attachment deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update recurrence for a task
export const updateTaskRecurrence = async (req, res) => {
    // TODO: Implement recurrence update
    res.status(501).json({ error: 'Not implemented' });
};

// Get next occurrence for a task
export const getTaskNextOccurrence = async (req, res) => {
    // TODO: Implement next occurrence retrieval
    res.status(501).json({ error: 'Not implemented' });
};

// Link a memo to a task
export const linkMemoToTask = async (req, res) => {
    // TODO: Implement memo linking
    res.status(501).json({ error: 'Not implemented' });
};

// Unlink a memo from a task
export const unlinkMemoFromTask = async (req, res) => {
    // TODO: Implement memo unlinking
    res.status(501).json({ error: 'Not implemented' });
};

// Update custom category for a task
export const updateTaskCategory = async (req, res) => {
    // TODO: Implement category update
    res.status(501).json({ error: 'Not implemented' });
};

// Get audit log for a task
export const getTaskAuditLog = async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        // Return all activity, sorted by createdAt descending
        const log = (task.activity || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(log);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delegate/reassign a task
export const delegateTask = async (req, res) => {
    // TODO: Implement task delegation
    res.status(501).json({ error: 'Not implemented' });
};

// Advanced search/filter
export const searchTasks = async (req, res) => {
    // TODO: Implement advanced search/filter
    res.status(501).json({ error: 'Not implemented' });
};