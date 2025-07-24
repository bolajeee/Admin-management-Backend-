import ActivityService from './activity.service.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';

/**
 * Service for generating activity-based reports
 */
class ActivityReportService {
  /**
   * Get user engagement report
   * Shows how active users are in the system
   * @param {Date} startDate - Start date for report
   * @param {Date} endDate - End date for report
   * @returns {Promise<Object>} User engagement data
   */
  static async getUserEngagementReport(startDate, endDate) {
    try {
      // Default to last 30 days if no dates provided
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();
      
      // Get all employees
      const employees = await User.find({ role: 'employee' })
        .select('_id name email');
      
      // Get team activity summary
      const employeeIds = employees.map(emp => emp._id.toString());
      const activitySummary = await ActivityService.getTeamActivitySummary(
        employeeIds, start, end
      );
      
      // Create a map of user IDs to their names for easy lookup
      const userMap = employees.reduce((map, user) => {
        map[user._id.toString()] = {
          name: user.name,
          email: user.email
        };
        return map;
      }, {});
      
      // Enhance the user activity data with names
      const enhancedUserData = activitySummary.users.map(userData => ({
        ...userData,
        name: userMap[userData.userId]?.name || 'Unknown User',
        email: userMap[userData.userId]?.email || 'unknown@example.com'
      }));
      
      // Sort users by activity count (most active first)
      enhancedUserData.sort((a, b) => b.totalActivities - a.totalActivities);
      
      // Calculate engagement score (0-100) based on activity frequency
      const totalDays = activitySummary.period.totalDays;
      enhancedUserData.forEach(user => {
        // Calculate engagement score based on ratio of active days to total days
        const engagementScore = Math.min(100, Math.round((user.activeDays / totalDays) * 100));
        user.engagementScore = engagementScore;
        
        // Assign engagement level based on score
        if (engagementScore >= 80) user.engagementLevel = 'High';
        else if (engagementScore >= 50) user.engagementLevel = 'Medium';
        else if (engagementScore >= 20) user.engagementLevel = 'Low';
        else user.engagementLevel = 'Inactive';
      });
      
      // Get daily activity counts for trend analysis
      const dailyActivity = await this.getDailyActivityCounts(start, end);
      
      return {
        period: activitySummary.period,
        users: enhancedUserData,
        teamSummary: {
          ...activitySummary.teamTotals,
          averageEngagementScore: enhancedUserData.length > 0 
            ? Math.round(enhancedUserData.reduce((sum, user) => sum + user.engagementScore, 0) / enhancedUserData.length) 
            : 0
        },
        trends: {
          dailyActivity
        }
      };
    } catch (error) {
      console.error('Error generating user engagement report:', error);
      throw error;
    }
  }
  
  /**
   * Get action type breakdown report
   * Shows what types of actions users are performing
   * @param {Date} startDate - Start date for report
   * @param {Date} endDate - End date for report
   * @returns {Promise<Object>} Action breakdown data
   */
  static async getActionBreakdownReport(startDate, endDate) {
    try {
      // Default to last 30 days if no dates provided
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();
      
      // Get action counts using aggregation
      const actionCounts = await mongoose.model('Activity').aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      // Calculate total activities
      const totalActivities = actionCounts.reduce((sum, action) => sum + action.count, 0);
      
      // Calculate percentages and format data for charts
      const formattedData = actionCounts.map(action => ({
        action: action._id,
        count: action.count,
        percentage: totalActivities > 0 
          ? parseFloat(((action.count / totalActivities) * 100).toFixed(1)) 
          : 0
      }));
      
      return {
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        totalActivities,
        actionBreakdown: formattedData
      };
    } catch (error) {
      console.error('Error generating action breakdown report:', error);
      throw error;
    }
  }
  
  /**
   * Get daily activity counts for trend analysis
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Daily activity counts
   */
  static async getDailyActivityCounts(startDate, endDate) {
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // Get daily counts using aggregation
      const dailyCounts = await mongoose.model('Activity').aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ]);
      
      // Format data for charts
      return dailyCounts.map(day => ({
        date: new Date(day._id.year, day._id.month - 1, day._id.day).toISOString().split('T')[0],
        count: day.count
      }));
    } catch (error) {
      console.error('Error getting daily activity counts:', error);
      throw error;
    }
  }
}

export default ActivityReportService;