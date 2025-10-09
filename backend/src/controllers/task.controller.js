 import path from 'path';
      import { fileURLToPath } from 'url';

// Download task attachment
export const downloadTaskAttachment = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, null, 'Task not found', 404);
    }
    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return errorResponse(res, null, 'Attachment not found', 404);
    }
    // If using local storage, get file path from attachment.url
    // For local uploads, attachment.url is like /uploads/filename.ext
    if (attachment.url && attachment.url.startsWith('/uploads/')) {
      const absolutePath = path.resolve(process.cwd(), attachment.url.substring(1));

      res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
      res.setHeader('Content-Type', attachment.mimetype || 'application/octet-stream');
      return res.sendFile(absolutePath, (err) => {
        if (err) {
          return errorResponse(res, err, 'File not found', 404);
        }
      });
    } else if (attachment.url) {
      // If url is external (e.g., cloudinary), redirect to download
      return res.redirect(attachment.url);
    } else {
      return errorResponse(res, null, 'File not found', 404);
    }
  } catch (error) {
    return errorResponse(res, error, 'Failed to download attachment');
  }
};
import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import Memo from '../models/memo.model.js';
import Audit from '../models/audit.model.js';
import { successResponse, errorResponse, validationError } from '../utils/responseHandler.js';
import { queryBuilder, populateFields } from '../utils/queryUtils.js';
import ValidationUtils from '../utils/validationUtils.js';
import NotificationService from '../services/notification.service.js';
import AuditService from '../services/audit.service.js';
import mongoose from 'mongoose';
import FileService from '../services/file.service.js';

/**
 * Create a new task
 */
import { debugLog, handleServerError } from '../utils/debugUtils.js';

export const createTask = async (req, res) => {
  try {
    const validation = ValidationUtils.taskValidation(req.body);
    if (!validation.isValid) {
      return validationError(res, validation.errors);
    }

    const {
      title,
      description,
      dueDate,
      priority,
      assignedTo,
      status,
      category
    } = req.body;

    let assignedToArray = [];
    if (assignedTo) {
      assignedToArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
      assignedToArray = assignedToArray
        .filter(id => ValidationUtils.isValidObjectId(id));
    }

    if (!req.user?._id) {
      return errorResponse(res, null, 'Authentication required', 401);
    }

    const taskData = {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      assignedTo: assignedToArray,
      createdBy: req.user._id,
      status: status || 'todo',
      category
    };

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

    await AuditService.createAuditLog({
        user: req.user._id,
        action: 'task_created',
        details: { taskId: savedTask._id, title: savedTask.title }
    });

    return successResponse(res, populatedTask, 'Task created successfully', 201);
  } catch (error) {
    return handleServerError(res, error, 'Failed to create task');
  }
};

/**
 * Get all tasks (admin only)
 */
export const getTasks = async (req, res) => {
  try {
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

    const tasks = await Task.find(queryOptions.query)
      .sort(queryOptions.sort)
      .skip(queryOptions.skip)
      .limit(queryOptions.limit);

    const populatedTasks = await populateFields(Task, tasks, {
      assignedTo: { model: User, select: 'name email profilePicture' },
      createdBy: { model: User, select: 'name email' }
    });

    return successResponse(res, populatedTasks, 'Tasks retrieved successfully');
  } catch (error) {
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
    return successResponse(res, { count }, 'Task count retrieved successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to get task count');
  }
};

/**
 * Get tasks for current user
 */
// Fix getUserTasks to handle potential populate errors
export const getUserTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.userId })
      .populate('createdBy', 'name email profilePicture')
      .sort({ createdAt: -1 });

    return successResponse(res, tasks, 'User tasks retrieved successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to fetch user tasks');
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
      return errorResponse(res, null, 'Task not found', 404);
    }

    return successResponse(res, task, 'Task retrieved successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to fetch task');
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
    const isAdmin = req.user.role.name === 'admin';
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
        updatedAt: Date.now(),
        completedAt: status === 'completed' ? Date.now() : null
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

    await AuditService.createAuditLog({
        user: req.user._id,
        action: 'task_updated',
        details: { taskId: updatedTask._id, title: updatedTask.title }
    });

    return successResponse(res, populatedTask, 'Task updated successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to update task');
  }
};

/**
 * Delete a task
 */
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return errorResponse(res, null, 'Task not found', 404);
    }

    // Check if user can delete this task (admin or creator)
    const isAdmin = req.user.role.name === 'admin';
    const isCreator = task.createdBy.toString() === req.user.userId;

    if (!isAdmin && !isCreator) {
      return errorResponse(res, null, 'Not authorized to delete this task', 403);
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

    await AuditService.createAuditLog({
        user: req.user._id,
        action: 'task_deleted',
        details: { taskId: task._id, title: task.title }
    });

    return successResponse(res, null, 'Task deleted successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to delete task');
  }
};

// Temporary debug function
export const debugTaskSchema = async (req, res) => {
  try {
    // Get one sample task
    const task = await Task.findOne();

    if (!task) {
      return errorResponse(res, null, 'No tasks found', 404);
    }

    return successResponse(res, {
      message: 'Task schema logged to console',
      documentStructure: Object.keys(task.toObject()),
      schemaPaths: Object.keys(Task.schema.paths)
    }, 'Task schema retrieved successfully');
  } catch (error) {
    return errorResponse(res, error, 'Error debugging task schema');
  }
};

// Add comment to task
export const addTaskComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return errorResponse(res, null, 'Comment text is required', 400);
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, null, 'Task not found', 404);
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
    return successResponse(res, newComment, 'Comment added successfully', 201);
  } catch (error) {
    return errorResponse(res, error, 'Failed to add comment');
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
      return errorResponse(res, null, 'Task not found', 404);
    }

    return successResponse(res, task.comments || [], 'Comments retrieved successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to fetch comments');
  }
};

// Upload task attachment
export const uploadTaskAttachment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const file = req.file;

    if (!file) {
      return errorResponse(res, null, 'No file uploaded', 400);
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, null, 'Task not found', 404);
    }

    const dataURI = FileService.getDataURI(file);
    const cldRes = await FileService.handleUpload(dataURI);

    const attachmentData = {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: cldRes.secure_url,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    if (!task.attachments) {
      task.attachments = [];
    }

    task.attachments.push(attachmentData);
    await task.save();

    return successResponse(res, attachmentData, 'Attachment uploaded successfully', 201);
  } catch (error) {
    return errorResponse(res, error, 'Failed to upload attachment');
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
      return errorResponse(res, null, 'Task not found', 404);
    }

    return successResponse(res, task.attachments || [], 'Attachments retrieved successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to fetch attachments');
  }
};

// Delete task attachment
export const deleteTaskAttachment = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, null, 'Task not found', 404);
    }

    // Find and remove the attachment
    if (!task.attachments) {
      return errorResponse(res, null, 'No attachments found', 404);
    }

    const attachmentIndex = task.attachments.findIndex(a => a._id.toString() === attachmentId);
    if (attachmentIndex === -1) {
      return errorResponse(res, null, 'Attachment not found', 404);
    }

    // Remove the attachment from storage (if using a service like cloudinary)
    // Here you would call your storage service to delete the file

    // Remove attachment from the array
    task.attachments.splice(attachmentIndex, 1);
    await task.save();

    return successResponse(res, null, 'Attachment deleted successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to delete attachment');
  }
};

// Link memo to task
export const linkMemoToTask = async (req, res) => {
  try {
    const { taskId, memoId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, null, 'Task not found', 404);
    }

    // Check if memo exists
    const memoExists = await Memo.findById(memoId);
    if (!memoExists) {
      return errorResponse(res, null, 'Memo not found', 404);
    }

    // Initialize linkedMemos array if it doesn't exist
    if (!task.linkedMemos) {
      task.linkedMemos = [];
    }

    // Check if already linked
    if (task.linkedMemos.includes(memoId)) {
      return errorResponse(res, null, 'Memo already linked to this task', 400);
    }

    // Link memo
    task.linkedMemos.push(memoId);
    await task.save();

    return successResponse(res, null, 'Memo linked successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to link memo');
  }
};

// Unlink memo from task
export const unlinkMemoFromTask = async (req, res) => {
  try {
    const { taskId, memoId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, null, 'Task not found', 404);
    }

    // Check if task has linked memos
    if (!task.linkedMemos || !task.linkedMemos.length) {
      return errorResponse(res, null, 'No linked memos found', 400);
    }

    // Remove memo from linkedMemos
    task.linkedMemos = task.linkedMemos.filter(id => id.toString() !== memoId);
    await task.save();

    return successResponse(res, null, 'Memo unlinked successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to unlink memo');
  }
};

// Delegate task to another user
export const delegateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { assignee } = req.body;

    if (!assignee) {
      return errorResponse(res, null, 'Assignee ID is required', 400);
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, null, 'Task not found', 404);
    }

    // Check if user exists
    const user = await User.findById(assignee);
    if (!user) {
      return errorResponse(res, null, 'User not found', 404);
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

    return successResponse(res, updatedTask, 'Task delegated successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to delegate task');
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

    return successResponse(res, tasks, 'Tasks retrieved successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to search tasks');
  }
};

// Get task audit log
export const getTaskAuditLog = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, null, 'Task not found', 404);
    }

    const auditLog = await Audit.find({ 'details.taskId': taskId })
      .populate('user', 'name email profilePicture')
      .sort({ timestamp: -1 });

    return successResponse(res, auditLog, 'Audit log retrieved successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to fetch audit log');
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

    return successResponse(res, result, 'Tasks completed over time retrieved successfully');
  } catch (error) {
    return errorResponse(res, error, 'Failed to get tasks completed analytics');
  }
};
