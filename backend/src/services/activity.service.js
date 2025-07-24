import Activity from '../models/activity.model.js';

/**
 * Service for tracking user activity
 */
class ActivityService {
  /**
   * Log a user activity
   * @param {Object} activityData - Activity information
   * @returns {Promise<Object>} Created activity record
   */
  static async logActivity(activityData) {
    try {
      const activity = new Activity(activityData);
      await activity.save();
      return activity;
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw - activity logging should never break the main flow
    }
  }
  
  /**
   * Get activities for a specific user
   * @param {String} userId - User ID
   * @param {Object} filters - Optional filters (action, timeframe, etc.)
   * @returns {Promise<Array>} Activity records
   */
  static async getUserActivities(userId, filters = {}) {
    try {
      const query = { user: userId };
      
      // Apply filters
      if (filters.action) query.action = filters.action;
      if (filters.resourceType) query.resourceType = filters.resourceType;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }
      
      return await Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 100);
    } catch (error) {
      console.error('Error fetching user activities:', error);
      throw error;
    }
  }
  
  /**
   * Get activity summary for a user
   * @param {String} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Activity summary
   */
  static async getUserActivitySummary(userId, startDate, endDate) {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();
      
      // Use MongoDB aggregation for efficient summary calculation
      const summary = await Activity.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(userId),
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            firstAction: { $min: '$createdAt' },
            lastAction: { $max: '$createdAt' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      // Calculate total activities and active days
      const totalActivities = summary.reduce((total, item) => total + item.count, 0);
      
      // Calculate active days (days with at least one activity)
      const activeDays = await Activity.aggregate([
        {
          $match: {
            user: mongoose.Types.ObjectId(userId),
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            }
          }
        },
        {
          $count: 'activeDays'
        }
      ]);
      
      return {
        userId,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          totalDays: Math.ceil((end - start) / (24 * 60 * 60 * 1000))
        },
        totalActivities,
        activeDays: activeDays[0]?.activeDays || 0,
        actionBreakdown: summary
      };
    } catch (error) {
      console.error('Error fetching user activity summary:', error);
      throw error;
    }
  }
  
  /**
   * Get team activity summary
   * @param {Array} userIds - Array of user IDs
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Team activity summary
   */
  static async getTeamActivitySummary(userIds, startDate, endDate) {
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();
      
      // If no user IDs provided, return empty summary
      if (!userIds || userIds.length === 0) {
        return {
          period: {
            start: start.toISOString(),
            end: end.toISOString()
          },
          users: [],
          teamTotals: {
            totalActivities: 0,
            averageActivitiesPerUser: 0
          }
        };
      }
      
      // Convert user IDs to MongoDB ObjectIds
      const objectIds = userIds.map(id => mongoose.Types.ObjectId(id));
      
      // Get individual summaries for each user
      const userSummaries = await Promise.all(
        userIds.map(userId => this.getUserActivitySummary(userId, start, end))
      );
      
      // Calculate team totals
      const totalActivities = userSummaries.reduce((sum, user) => sum + user.totalActivities, 0);
      const averageActivitiesPerUser = userSummaries.length > 0 
        ? totalActivities / userSummaries.length 
        : 0;
      
      return {
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          totalDays: Math.ceil((end - start) / (24 * 60 * 60 * 1000))
        },
        users: userSummaries,
        teamTotals: {
          totalActivities,
          averageActivitiesPerUser,
          userCount: userSummaries.length
        }
      };
    } catch (error) {
      console.error('Error fetching team activity summary:', error);
      throw error;
    }
  }
}

export default ActivityService;