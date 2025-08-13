import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import Memo from '../models/memo.model.js';
import { successResponse, errorResponse, validationError } from '../utils/responseHandler.js';
import { queryBuilder, populateFields } from '../utils/queryUtils.js';
import ValidationUtils from '../utils/validationUtils.js';
import NotificationService from '../services/notification.service.js';
import mongoose from 'mongoose';

/**
 * Create a new task
 */
import { debugLog, handleServerError } from '../utils/debugUtils.js';

export const createTask = async (req, res) => {
  try {
    debugLog('Request body', req.body);
    debugLog('User info', req.user);

    // Validate request data
    const validation = ValidationUtils.taskValidation(req.body);
    if (!validation.isValid) {
      debugLog('Validation failed', validation.errors);
      return validationError(res, validation.errors);
    }

    const {
      title,
      description,
      dueDate,
      priority,
      assignedTo,
      status,
      category,
      recurrence
    } = req.body;

    // Normalize and validate assignedTo
    let assignedToArray = [];
    if (assignedTo) {
      assignedToArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
      assignedToArray = assignedToArray
        .filter(id => ValidationUtils.isValidObjectId(id));
    }

    if (!req.user?._id) {
      return errorResponse(res, null, 'Authentication required', 401);
    }

    console.log('Creating task with data:', {
      title,
      description,
      dueDate,
      priority,
      assignedTo: assignedToArray,
      status,
      category,
      recurrence
    });

    // Check if we have a valid user ID
    if (!req.user?._id) {
      console.error('Invalid user ID:', req.user);
      return errorResponse(res, null, 'Invalid user ID', 400);
    }

    // Validate task data
    if (!title) {
      console.error('Title is required');
      return errorResponse(res, null, 'Title is required', 400);
    }

    const taskData = {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      assignedTo: assignedToArray,
      createdBy: req.user._id,
      status: status || 'todo',
      category,
      recurrence
    };

    console.log('Task data before creation:', taskData);
    const task = new Task(taskData);

    const savedTask = await task.save();

    if (assignedToArray.length > 0) {
      const users = await User.find({ _id: { $in: assignedToArray } });
      await NotificationService.notifyTaskAssignment(savedTask, users);
    }

    const populatedTask = await populateFields(Task, savedTask, {
      assignedTo: { model: User, select: 'name email profilePicture' },
      createdBy: { model: User, select: 'name email' }
    });

    return successResponse(res, populatedTask, 'Task created successfully', 201);
  } catch (error) {
    debugLog('Error in createTask', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      debugLog('Validation error messages', messages);
      return res.status(400).json({
        message: 'Validation error',
        errors: messages
      });
    }

    return handleServerError(res, error, 'Failed to create task');
  }
};

/**
 * Get all tasks (admin only)
 */
export const getTasks = async (req, res) => {
  try {
    console.log('[getTasks] Query parameters:', req.query);
    const { status, priority, assignee, category, search, page, limit, sortBy } = req.query;

    const queryOptions = queryBuilder({}, {
      filters: {
        status,
        priority,
        assignedTo: assignee,
        category
      },
      search,
      searchFields: ['title', 'description'],
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sort: sortBy ? { [sortBy]: -1 } : { createdAt: -1 }
    });

    console.log('[getTasks] Query options:', queryOptions);

    const tasks = await Task.find(queryOptions.query)
      .sort(queryOptions.sort)
      .skip(queryOptions.skip)
      .limit(queryOptions.limit);

    console.log(`[getTasks] Found ${tasks.length} tasks`);

    try {
      const populatedTasks = await populateFields(Task, tasks, {
        assignedTo: { model: User, select: 'name email profilePicture' },
        createdBy: { model: User, select: 'name email' }
      });

      return successResponse(res, populatedTasks, 'Tasks retrieved successfully');
    } catch (populateError) {
      console.error('[getTasks] Error populating fields:', populateError);
      // Return unpopulated tasks if population fails
      return successResponse(res, tasks, 'Tasks retrieved (without user details)');
    }
  } catch (error) {
    console.error('[getTasks] Error:', error);
    return errorResponse(res, error, 'Failed to fetch tasks');
  }
};

// Rest of the controller functions...

/**
 * Get task count
 */
export const getTaskCount = async (req, res) => {
  try {
    const count = await Task.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error getting task count:', error);
    res.status(500).json({ message: 'Failed to get task count' });
  }
};

/**
 * Get tasks for current user
 */
// Fix getUserTasks to handle potential populate errors
export const getUserTasks = async (req, res) => {
  try {
    let tasks;

    try {
      tasks = await Task.find({
        assignedTo: req.user.userId
      })
        .populate('createdBy', 'name email profilePicture')
        .sort({ createdAt: -1 });
    } catch (populateError) {
      // Fallback if populate fails
      tasks = await Task.find({
        assignedTo: req.user.userId
      }).sort({ createdAt: -1 });

      // Manually populate creator info
      const creatorIds = [...new Set(
        tasks.map(task => task.createdBy ? task.createdBy.toString() : null).filter(Boolean)
      )];

      const creators = await User.find({ _id: { $in: creatorIds } })
        .select('_id name email profilePicture');

      const creatorMap = {};
      creators.forEach(creator => {
        creatorMap[creator._id.toString()] = creator;
      });

      tasks = tasks.map(task => {
        const taskObj = task.toObject();

        if (taskObj.createdBy && creatorMap[taskObj.createdBy.toString()]) {
          taskObj.createdBy = creatorMap[taskObj.createdBy.toString()];
        }

        return taskObj;
      });
    }

    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ message: 'Failed to fetch user tasks' });
  }
};

// Same pattern for other functions that use populate

/**
 * Get a specific task by ID
 */
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('assignedTo', 'name email profilePicture')
      .populate('createdBy', 'name email profilePicture');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
};

/**
 * Update a task
 */
export const updateTask = async (req, res) => {
  try {
    // Validate request data
    const validation = ValidationUtils.taskValidation(req.body);
    if (!validation.isValid) {
      return validationError(res, validation.errors);
    }

    const { title, description, dueDate, priority, status, assignedTo } = req.body;
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return errorResponse(res, null, 'Task not found', 404);
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isCreator = task.createdBy.toString() === req.user.userId;
    const isAssignee = task.assignedTo && task.assignedTo.toString() === req.user.userId;

    if (!isAdmin && !isCreator && !isAssignee) {
      return errorResponse(res, null, 'Not authorized to update this task', 403);
    }

    const assignmentChanged = assignedTo && (!task.assignedTo || task.assignedTo.toString() !== assignedTo);
    const statusChanged = task.status !== status;

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.taskId,
      {
        title,
        description,
        dueDate,
        priority,
        status,
        assignedTo,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    const populatedTask = await populateFields(Task, updatedTask, {
      assignedTo: { model: User, select: 'name email profilePicture' },
      createdBy: { model: User, select: 'name email profilePicture' }
    });

    // Handle notifications
    if (assignmentChanged) {
      const user = await User.findById(assignedTo);
      if (user) {
        await NotificationService.notifyTaskAssignment(populatedTask, user);
      }
    }

    if (statusChanged && status === 'completed') {
      const creator = await User.findById(task.createdBy);
      if (creator) {
        await NotificationService.notifyTaskUpdate(populatedTask, 'completion', [creator._id]);
      }
    }

    return successResponse(res, populatedTask, 'Task updated successfully');
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
};

/**
 * Delete a task
 */
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user can delete this task (admin or creator)
    const isAdmin = req.user.role === 'admin';
    const isCreator = task.createdBy.toString() === req.user.userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await Task.findByIdAndDelete(req.params.taskId);

    // Notify the assigned user if there is one
    if (task.assignedTo) {
      const user = await User.findById(task.assignedTo);
      if (user && user.socketId) {
        io.to(user.socketId).emit('taskDeleted', {
          taskId: task._id,
          message: `Task "${task.title}" has been deleted`
        });
      }
    }

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
};

/**
 * Mark a task as complete
 */
export const markTaskComplete = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user can complete this task (admin, creator or assignee)
    const isAdmin = req.user.role === 'admin';
    const isCreator = task.createdBy.toString() === req.user.userId;
    const isAssignee = task.assignedTo && task.assignedTo.toString() === req.user.userId;

    if (!isAdmin && !isCreator && !isAssignee) {
      return res.status(403).json({ message: 'Not authorized to complete this task' });
    }

    // Update the task
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.taskId,
      {
        status: 'completed',
        completedAt: Date.now(),
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email profilePicture')
      .populate('createdBy', 'name email profilePicture');

    // Notify the creator if the assignee completed it
    if (isAssignee && !isCreator) {
      const creator = await User.findById(task.createdBy);
      if (creator && creator.socketId) {
        io.to(creator.socketId).emit('taskCompleted', {
          task: updatedTask,
          message: `Task "${task.title}" has been completed`
        });
      }
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ message: 'Failed to complete task' });
  }
};

/**
 * Assign task to user
 */
export const assignTask = async (req, res) => {
  try {
    const { taskId, userId } = req.params;

    // Verify the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find and update the task
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user has permission (admin or creator)
    const isAdmin = req.user.role === 'admin';
    const isCreator = task.createdBy.toString() === req.user.userId;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to assign this task' });
    }

    // Update the task
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        assignedTo: userId,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email profilePicture')
      .populate('createdBy', 'name email profilePicture');

    // Notify the assigned user
    if (user.socketId) {
      io.to(user.socketId).emit('taskAssigned', {
        task: updatedTask,
        message: `You have been assigned a task: ${task.title}`
      });
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ message: 'Failed to assign task' });
  }
};

// Temporary debug function
export const debugTaskSchema = async (req, res) => {
  try {
    // Get one sample task
    const task = await Task.findOne();

    if (!task) {
      return res.status(404).json({ message: 'No tasks found' });
    }

    // Log the structure
    console.log('Task document structure:', Object.keys(task.toObject()));
    console.log('Task schema paths:', Object.keys(Task.schema.paths));

    res.status(200).json({
      message: 'Task schema logged to console',
      documentStructure: Object.keys(task.toObject()),
      schemaPaths: Object.keys(Task.schema.paths)
    });
  } catch (error) {
    console.error('Error debugging task schema:', error);
    res.status(500).json({ message: 'Error debugging task schema' });
  }
};

// Add comment to task
export const addTaskComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Initialize comments array if it doesn't exist
    if (!task.comments) {
      task.comments = [];
    }

    // Add comment with user info
    task.comments.push({
      text: comment,
      user: req.user._id,
      createdAt: new Date()
    });

    await task.save();

    // Return the newly added comment
    const updatedTask = await Task.findById(taskId)
      .populate({
        path: 'comments.user',
        select: 'name profilePicture'
      });

    const newComment = updatedTask.comments[updatedTask.comments.length - 1];
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error adding comment to task:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

// Get task comments
export const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate({
        path: 'comments.user',
        select: 'name profilePicture'
      });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json(task.comments || []);
  } catch (error) {
    console.error('Error fetching task comments:', error);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
};

// Upload task attachment
export const uploadTaskAttachment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Use cloudinary or similar service to upload the file
    // For this example, we'll simulate a successful upload
    const attachmentData = {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `https://example.com/files/${Date.now()}-${file.originalname}`, // Placeholder URL
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    // Initialize attachments array if it doesn't exist
    if (!task.attachments) {
      task.attachments = [];
    }

    task.attachments.push(attachmentData);
    await task.save();

    res.status(201).json(attachmentData);
  } catch (error) {
    console.error('Error uploading task attachment:', error);
    res.status(500).json({ message: 'Failed to upload attachment' });
  }
};

// List task attachments
export const listTaskAttachments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate({
        path: 'attachments.uploadedBy',
        select: 'name'
      });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.status(200).json(task.attachments || []);
  } catch (error) {
    console.error('Error fetching task attachments:', error);
    res.status(500).json({ message: 'Failed to fetch attachments' });
  }
};

// Delete task attachment
export const deleteTaskAttachment = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Find and remove the attachment
    if (!task.attachments) {
      return res.status(404).json({ message: 'No attachments found' });
    }

    const attachmentIndex = task.attachments.findIndex(a => a._id.toString() === attachmentId);
    if (attachmentIndex === -1) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Remove the attachment from storage (if using a service like cloudinary)
    // Here you would call your storage service to delete the file

    // Remove attachment from the array
    task.attachments.splice(attachmentIndex, 1);
    await task.save();

    res.status(200).json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting task attachment:', error);
    res.status(500).json({ message: 'Failed to delete attachment' });
  }
};

// Link memo to task
export const linkMemoToTask = async (req, res) => {
  try {
    const { taskId, memoId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if memo exists
    const memoExists = await Memo.findById(memoId);
    if (!memoExists) {
      return res.status(404).json({ message: 'Memo not found' });
    }

    // Initialize linkedMemos array if it doesn't exist
    if (!task.linkedMemos) {
      task.linkedMemos = [];
    }

    // Check if already linked
    if (task.linkedMemos.includes(memoId)) {
      return res.status(400).json({ message: 'Memo already linked to this task' });
    }

    // Link memo
    task.linkedMemos.push(memoId);
    await task.save();

    res.status(200).json({ message: 'Memo linked successfully' });
  } catch (error) {
    console.error('Error linking memo to task:', error);
    res.status(500).json({ message: 'Failed to link memo' });
  }
};

// Unlink memo from task
export const unlinkMemoFromTask = async (req, res) => {
  try {
    const { taskId, memoId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if task has linked memos
    if (!task.linkedMemos || !task.linkedMemos.length) {
      return res.status(400).json({ message: 'No linked memos found' });
    }

    // Remove memo from linkedMemos
    task.linkedMemos = task.linkedMemos.filter(id => id.toString() !== memoId);
    await task.save();

    res.status(200).json({ message: 'Memo unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking memo from task:', error);
    res.status(500).json({ message: 'Failed to unlink memo' });
  }
};

// Delegate task to another user
export const delegateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { assignee } = req.body;

    if (!assignee) {
      return res.status(400).json({ message: 'Assignee ID is required' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if user exists
    const user = await User.findById(assignee);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update task assignee
    task.assignedTo = assignee;
    task.delegatedBy = req.user._id;
    task.delegatedAt = new Date();

    await task.save();

    const updatedTask = await Task.findById(taskId)
      .populate('assignedTo', 'name email profilePicture')
      .populate('createdBy', 'name email profilePicture')
      .populate('delegatedBy', 'name email profilePicture');

    // Notify the newly assigned user
    if (user.socketId) {
      io.to(user.socketId).emit('taskDelegated', {
        task: updatedTask,
        message: `Task "${task.title}" has been delegated to you by ${req.user.name}`
      });
    }

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error delegating task:', error);
    res.status(500).json({ message: 'Failed to delegate task' });
  }
};

// Advanced search for tasks
export const searchTasks = async (req, res) => {
  try {
    const {
      title,
      status,
      priority,
      category,
      createdBy,
      assignedTo,
      dateFrom,
      dateTo,
      hasAttachments,
      hasComments
    } = req.query;

    // Build query filter
    const filter = {};

    if (title) filter.title = { $regex: title, $options: 'i' };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (createdBy) filter.createdBy = createdBy;
    if (assignedTo) filter.assignedTo = assignedTo;

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Has attachments/comments filters
    if (hasAttachments === 'true') {
      filter.$expr = { $gt: [{ $size: '$attachments' }, 0] };
    }
    if (hasComments === 'true') {
      filter.$expr = { $gt: [{ $size: '$comments' }, 0] };
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email profilePicture')
      .populate('createdBy', 'name email profilePicture')
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error searching tasks:', error);
    res.status(500).json({ message: 'Failed to search tasks' });
  }
};

// Get task audit log
export const getTaskAuditLog = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // For a real implementation, you would have a separate TaskAudit model
    // This is a simplified example that returns placeholder data
    const auditLog = [
      {
        action: 'created',
        timestamp: task.createdAt,
        user: task.createdBy,
        details: `Task created with title "${task.title}"`
      }
    ];

    // If task has been updated
    if (task.updatedAt > task.createdAt) {
      auditLog.push({
        action: 'updated',
        timestamp: task.updatedAt,
        user: task.updatedBy || task.createdBy,
        details: 'Task details updated'
      });
    }

    // Sort by timestamp (newest first)
    auditLog.sort((a, b) => b.timestamp - a.timestamp);

    // Populate user details
    const userIds = auditLog.map(entry => entry.user);
    const users = await User.find({ _id: { $in: userIds } })
      .select('name email profilePicture');

    const userMap = {};
    users.forEach(user => {
      userMap[user._id.toString()] = user;
    });

    const populatedAuditLog = auditLog.map(entry => ({
      ...entry,
      user: userMap[entry.user.toString()]
    }));

    res.status(200).json(populatedAuditLog);
  } catch (error) {
    console.error('Error fetching task audit log:', error);
    res.status(500).json({ message: 'Failed to fetch audit log' });
  }
};

/**
 * Get number of tasks completed per day for the last 30 days
 * @route GET /api/tasks/analytics/completed
 * @access Private/Admin
 */
export const getTasksCompletedOverTime = async (req, res) => {
  try {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 29); // last 30 days including today
    startDate.setHours(0, 0, 0, 0);

    const data = await Task.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in days with zero if missing
    const result = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      const found = data.find(d => d._id === dateStr);
      result.push({ date: dateStr, count: found ? found.count : 0 });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting tasks completed over time:', error);
    res.status(500).json({ message: 'Failed to get tasks completed analytics' });
  }
};
