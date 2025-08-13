import mongoose from 'mongoose';

export const validateTask = (taskData) => {
  const errors = [];

  // Required fields
  if (!taskData.title?.trim()) {
    errors.push('Title is required');
  }

  // Status validation
  const validStatuses = ['todo', 'in-progress', 'blocked', 'completed', 'cancelled'];
  if (taskData.status && !validStatuses.includes(taskData.status)) {
    errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  // Priority validation
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (taskData.priority && !validPriorities.includes(taskData.priority)) {
    errors.push(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
  }

  // Due date validation
  if (taskData.dueDate) {
    const dueDate = new Date(taskData.dueDate);
    if (isNaN(dueDate.getTime())) {
      errors.push('Invalid due date format');
    }
  }

  // Assignee validation
  if (taskData.assignedTo) {
    const assignees = Array.isArray(taskData.assignedTo) ? taskData.assignedTo : [taskData.assignedTo];
    assignees.forEach(id => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        errors.push(`Invalid assignee ID: ${id}`);
      }
    });
  }

  // Recurrence validation
  if (taskData.recurrence) {
    const validFrequencies = ['none', 'daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(taskData.recurrence.frequency)) {
      errors.push(`Invalid recurrence frequency. Must be one of: ${validFrequencies.join(', ')}`);
    }

    if (taskData.recurrence.endDate) {
      const endDate = new Date(taskData.recurrence.endDate);
      if (isNaN(endDate.getTime())) {
        errors.push('Invalid recurrence end date format');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateTaskUpdate = (updateData, currentTask) => {
  const errors = [];

  // Status transition validation
  if (updateData.status && currentTask.status) {
    const invalidTransitions = {
      'completed': ['in-progress', 'todo'], // completed tasks can't go back to in-progress or todo
      'cancelled': ['in-progress', 'todo'], // cancelled tasks can't go back to in-progress or todo
      'blocked': [] // blocked tasks can transition to any state
    };

    const currentInvalidTransitions = invalidTransitions[currentTask.status] || [];
    if (currentInvalidTransitions.includes(updateData.status)) {
      errors.push(`Cannot transition from ${currentTask.status} to ${updateData.status}`);
    }
  }

  // Due date validation for existing tasks
  if (updateData.dueDate) {
    const dueDate = new Date(updateData.dueDate);
    if (isNaN(dueDate.getTime())) {
      errors.push('Invalid due date format');
    } else if (dueDate < new Date() && !currentTask.dueDate) {
      // Only warn about past due dates for new due dates
      errors.push('Warning: Due date is in the past');
    }
  }

  // Prevent removing all assignees if task is in progress
  if (Array.isArray(updateData.assignedTo) && 
      updateData.assignedTo.length === 0 && 
      currentTask.status === 'in-progress') {
    errors.push('Cannot remove all assignees from an in-progress task');
  }

  return {
    isValid: errors.length === 0,
    errors,
    hasWarnings: errors.some(e => e.startsWith('Warning:'))
  };
};

export const validateTaskDelegation = (task, newAssigneeId, currentUserId) => {
  const errors = [];

  // Check if task exists
  if (!task) {
    errors.push('Task not found');
    return { isValid: false, errors };
  }

  // Check if user has permission to delegate
  const isCreator = task.createdBy.toString() === currentUserId;
  const isCurrentAssignee = task.assignedTo.some(id => id.toString() === currentUserId);
  
  if (!isCreator && !isCurrentAssignee) {
    errors.push('Not authorized to delegate this task');
  }

  // Check if task can be delegated
  if (task.status === 'completed' || task.status === 'cancelled') {
    errors.push(`Cannot delegate ${task.status} tasks`);
  }

  // Validate new assignee
  if (!mongoose.Types.ObjectId.isValid(newAssigneeId)) {
    errors.push('Invalid assignee ID');
  }

  // Prevent self-delegation
  if (newAssigneeId === currentUserId) {
    errors.push('Cannot delegate task to yourself');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const generateRecurrenceSchedule = (task) => {
  if (!task.recurrence || task.recurrence.frequency === 'none') {
    return [];
  }

  const dates = [];
  let currentDate = new Date(task.dueDate);
  const endDate = task.recurrence.endDate ? new Date(task.recurrence.endDate) : null;

  while (!endDate || currentDate <= endDate) {
    dates.push(new Date(currentDate));

    switch (task.recurrence.frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      default:
        return dates;
    }
  }

  return dates;
};
