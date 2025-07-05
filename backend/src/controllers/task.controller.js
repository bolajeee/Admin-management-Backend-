import Task from '../models/task.model.js';

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
        
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (assignedTo) filter.assignedTo = assignedTo;
        
        const tasks = await Task.find(filter)
            .populate(['createdBy', 'assignedTo'])
            .sort({ createdAt: -1 });
            
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
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