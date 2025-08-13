import Task from '../models/task.model.js';

export const taskUtils = {
  /**
   * Create a recurring task based on a template task
   */
  async createRecurringTask(templateTask, dueDate) {
    const newTask = new Task({
      title: templateTask.title,
      description: templateTask.description,
      status: 'todo',
      priority: templateTask.priority,
      category: templateTask.category,
      dueDate: dueDate,
      assignedTo: templateTask.assignedTo,
      createdBy: templateTask.createdBy,
      // Don't copy over completedAt, delegatedBy, or delegatedAt
    });

    return newTask.save();
  },

  /**
   * Check and create recurring tasks that are due
   */
  async processRecurringTasks() {
    const recurringTasks = await Task.find({
      'recurrence.frequency': { $ne: 'none' },
      'recurrence.endDate': { $gt: new Date() }
    });

    for (const task of recurringTasks) {
      const schedule = generateRecurrenceSchedule(task);
      for (const dueDate of schedule) {
        // Check if a task already exists for this date
        const existingTask = await Task.findOne({
          title: task.title,
          dueDate: {
            $gte: new Date(dueDate.setHours(0, 0, 0, 0)),
            $lt: new Date(dueDate.setHours(23, 59, 59, 999))
          },
          createdBy: task.createdBy
        });

        if (!existingTask) {
          await this.createRecurringTask(task, dueDate);
        }
      }
    }
  },

  /**
   * Get task statistics for a user
   */
  async getUserTaskStats(userId) {
    const stats = await Task.aggregate([
      { $match: { assignedTo: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          overdue: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $lt: ['$dueDate', new Date()] },
                    { $ne: ['$status', 'completed'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Format stats into a more usable structure
    const formattedStats = {
      total: 0,
      todo: 0,
      inProgress: 0,
      completed: 0,
      blocked: 0,
      cancelled: 0,
      overdue: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id === 'in-progress' ? 'inProgress' : stat._id] = stat.count;
      formattedStats.total += stat.count;
      formattedStats.overdue += stat.overdue;
    });

    return formattedStats;
  },

  /**
   * Get completion rate for tasks
   */
  async getTaskCompletionRate(userId = null, startDate = null, endDate = null) {
    const match = {};
    if (userId) match.assignedTo = userId;
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const stats = await Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          completedOnTime: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $lte: ['$completedAt', '$dueDate'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        completionRate: 0,
        onTimeRate: 0,
        total: 0,
        completed: 0,
        completedOnTime: 0
      };
    }

    const { total, completed, completedOnTime } = stats[0];
    return {
      completionRate: (completed / total) * 100,
      onTimeRate: completed ? (completedOnTime / completed) * 100 : 0,
      total,
      completed,
      completedOnTime
    };
  },

  /**
   * Get task breakdown by category
   */
  async getTasksByCategory(userId = null) {
    const match = userId ? { assignedTo: userId } : {};

    return Task.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$dueDate', new Date()] },
                    { $ne: ['$status', 'completed'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }
};

export default taskUtils;
