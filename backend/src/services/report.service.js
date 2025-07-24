import User from '../models/user.model.js';
import Task from '../models/task.model.js';
import Message from '../models/message.model.js';
import Memo from '../models/memo.model.js';
import Report from '../models/report.model.js';
import cache from './cache.service.js';

/**
 * ReportService
 * Handles all business logic for generating reports
 * Separates data processing from controller request handling
 */
class ReportService {
  /**
   * Get key performance metrics for the dashboard
   * @param {Date} startDate - Start date for data range
   * @param {Date} endDate - End date for data range
   * @returns {Object} Metrics object with performance indicators
   */
  static async getMetrics(startDate, endDate) {
    // Default to last 30 days if no dates provided
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    // Check cache first
    const cacheKey = cache.generateKey('metrics', start, end);
    const cachedData = cache.get(cacheKey);
    if (cachedData) return cachedData;

    // Get previous period for trend comparison
    const periodLength = end - start;
    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = new Date(end.getTime() - periodLength);
    
    try {
      // Get current period data
      const [
        currentTasks, 
        currentMemos, 
        currentMessages,
        totalEmployees
      ] = await Promise.all([
        Task.countDocuments({ 
          createdAt: { $gte: start, $lte: end },
          status: 'completed'
        }),
        Memo.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        Message.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        User.countDocuments({ role: 'employee' })
      ]);
      
      // Get previous period data for comparison
      const [
        prevTasks, 
        prevMemos, 
        prevMessages
      ] = await Promise.all([
        Task.countDocuments({ 
          createdAt: { $gte: prevStart, $lte: prevEnd },
          status: 'completed'
        }),
        Memo.countDocuments({ createdAt: { $gte: prevStart, $lte: prevEnd } }),
        Message.countDocuments({ createdAt: { $gte: prevStart, $lte: prevEnd } })
      ]);
      
      // Calculate productivity (tasks per employee)
      const productivity = totalEmployees > 0 ? currentTasks / totalEmployees : 0;
      const prevProductivity = totalEmployees > 0 ? prevTasks / totalEmployees : 0;
      
      // Calculate trends (percentage change)
      const calculateTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return parseFloat(((current - previous) / previous * 100).toFixed(1));
      };
      
      // Simulate satisfaction based on memo responses
      const satisfaction = 85 + Math.floor(Math.random() * 10);
      const prevSatisfaction = 82 + Math.floor(Math.random() * 10);
      
      // Simulate revenue based on tasks completed
      const revenue = currentTasks * 2500 + 50000;
      const prevRevenue = prevTasks * 2500 + 50000;
      
      // Simulate cost efficiency
      const costEfficiency = 75 + Math.floor(Math.random() * 15);
      const prevCostEfficiency = 72 + Math.floor(Math.random() * 15);
      
      const result = {
        productivity,
        productivityTrend: calculateTrend(productivity, prevProductivity),
        satisfaction,
        satisfactionTrend: calculateTrend(satisfaction, prevSatisfaction),
        revenue,
        revenueTrend: calculateTrend(revenue, prevRevenue),
        costEfficiency,
        costEfficiencyTrend: calculateTrend(costEfficiency, prevCostEfficiency),
        
        // Additional detailed metrics
        tasks: {
          current: currentTasks,
          previous: prevTasks,
          trend: calculateTrend(currentTasks, prevTasks)
        },
        memos: {
          current: currentMemos,
          previous: prevMemos,
          trend: calculateTrend(currentMemos, prevMemos)
        },
        messages: {
          current: currentMessages,
          previous: prevMessages,
          trend: calculateTrend(currentMessages, prevMessages)
        },
        employees: totalEmployees
      };

      // Cache the result
      cache.set(cacheKey, result, 5 * 60 * 1000); // Cache for 5 minutes

      return result;
    } catch (error) {
      console.error('Error in getMetrics service:', error);
      throw error;
    }
  }
  
  /**
   * Get team performance data
   * @param {Date} startDate - Start date for data range
   * @param {Date} endDate - End date for data range
   * @returns {Object} Team performance metrics
   */
  static async getTeamPerformance(startDate, endDate) {
    // Default to last 30 days if no dates provided
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    try {
      // Get all employees
      const employees = await User.find({ role: 'employee' }).select('_id name');
      
      // For each employee, count their completed tasks
      const performancePromises = employees.map(async (employee) => {
        const taskCount = await Task.countDocuments({
          assignedTo: employee._id,
          status: 'completed',
          completedAt: { $gte: start, $lte: end }
        });
        
        return {
          name: employee.name,
          value: taskCount
        };
      });
      
      // Wait for all queries to complete
      const performance = await Promise.all(performancePromises);
      
      // Sort by value (task count) in descending order
      performance.sort((a, b) => b.value - a.value);
      
      // Additional metrics - task completion over time
      const timeRange = ReportService.generateDateRange(start, end, 7);
      
      const completionByDay = await Promise.all(
        timeRange.map(async (date) => {
          const dayStart = new Date(date);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);
          
          const count = await Task.countDocuments({
            status: 'completed',
            completedAt: { $gte: dayStart, $lte: dayEnd }
          });
          
          return {
            date: date.toISOString().split('T')[0],
            count
          };
        })
      );
      
      return {
        performance,
        timeline: completionByDay,
        totalTasks: performance.reduce((sum, emp) => sum + emp.value, 0),
        topPerformer: performance.length > 0 ? performance[0].name : null
      };
    } catch (error) {
      console.error('Error in getTeamPerformance service:', error);
      throw error;
    }
  }
  
  /**
   * Get client activity data
   * @param {Date} startDate - Start date for data range
   * @param {Date} endDate - End date for data range
   * @returns {Object} Client activity metrics
   */
  static async getClientActivity(startDate, endDate) {
    // Default to last 30 days if no dates provided
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    try {
      // Generate date range for the report
      const dates = ReportService.generateDateRange(start, end);
      
      // For each date, get message counts
      const activity = await Promise.all(
        dates.map(async (date) => {
          const dayStart = new Date(date);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);
          
          // Count interactions (messages sent)
          const interactions = await Message.countDocuments({
            createdAt: { $gte: dayStart, $lte: dayEnd }
          });
          
          // Count responses (we'll simulate this with messages with replies)
          const responses = await Message.countDocuments({
            createdAt: { $gte: dayStart, $lte: dayEnd },
            // This is a placeholder - in a real system you'd have a field
            // indicating if a message is a response to another message
            isResponse: true
          });
          
          return {
            date: date.toISOString().split('T')[0],
            interactions,
            responses
          };
        })
      );
      
      // Calculate totals and averages
      const totalInteractions = activity.reduce((sum, day) => sum + day.interactions, 0);
      const totalResponses = activity.reduce((sum, day) => sum + day.responses, 0);
      const avgResponseRate = totalInteractions > 0 
        ? (totalResponses / totalInteractions * 100).toFixed(1) 
        : 0;
      
      return {
        activity,
        summary: {
          totalInteractions,
          totalResponses,
          avgResponseRate,
          responseTime: '2.3 hours' // Placeholder - would calculate from actual data
        }
      };
    } catch (error) {
      console.error('Error in getClientActivity service:', error);
      throw error;
    }
  }
  
  /**
   * Get financial revenue data
   * @param {Date} startDate - Start date for data range
   * @param {Date} endDate - End date for data range
   * @returns {Object} Revenue data over time
   */
  static async getFinanceRevenue(startDate, endDate) {
    // Default to last 6 months if no dates provided
    const start = startDate || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    try {
      // For a realistic MVP, we'll calculate revenue based on task completion
      // In a real system, you'd have actual financial transaction data
      
      // Generate months for the report
      const months = ReportService.generateMonthRange(start, end);
      
      // For each month, calculate revenue
      const data = await Promise.all(
        months.map(async (month) => {
          const monthStart = new Date(month.year, month.month, 1);
          const monthEnd = new Date(month.year, month.month + 1, 0, 23, 59, 59, 999);
          
          // Count completed tasks in this month
          const completedTasks = await Task.countDocuments({
            status: 'completed',
            completedAt: { $gte: monthStart, $lte: monthEnd }
          });
          
          // Simulate revenue based on tasks
          // Base revenue + per-task revenue
          const taskRevenue = completedTasks * 2000;
          const baseRevenue = 30000 + Math.random() * 5000;
          const totalRevenue = Math.round(baseRevenue + taskRevenue);
          
          return {
            period: `${month.year}-${String(month.month + 1).padStart(2, '0')}`,
            value: totalRevenue,
            tasks: completedTasks
          };
        })
      );
      
      // Calculate summary statistics
      const totalRevenue = data.reduce((sum, month) => sum + month.value, 0);
      const avgMonthlyRevenue = totalRevenue / data.length;
      
      // Calculate growth rate
      const firstMonth = data[0]?.value || 0;
      const lastMonth = data[data.length - 1]?.value || 0;
      const growthRate = firstMonth > 0 
        ? ((lastMonth - firstMonth) / firstMonth * 100).toFixed(1) 
        : 0;
      
      return {
        data,
        summary: {
          totalRevenue,
          avgMonthlyRevenue,
          growthRate
        }
      };
    } catch (error) {
      console.error('Error in getFinanceRevenue service:', error);
      throw error;
    }
  }
  
  /**
   * Get financial expense categories data
   * @returns {Object} Expense data by category
   */
  static async getFinanceCategories() {
    try {
      // In a real system, you'd query your expense records
      // For the MVP, we'll create realistic expense categories
      
      // Generate random but realistic expense distribution
      const totalExpenses = 120000 + Math.random() * 30000;
      
      // Define expense categories and their typical percentages
      const categoryPercentages = {
        'Salaries': 0.55 + Math.random() * 0.1,
        'Marketing': 0.12 + Math.random() * 0.05,
        'Software': 0.08 + Math.random() * 0.04,
        'Office Space': 0.15 + Math.random() * 0.05,
        'Travel': 0.05 + Math.random() * 0.03,
        'Equipment': 0.05 + Math.random() * 0.03
      };
      
      // Calculate actual values and ensure they sum to totalExpenses
      let remainingPercentage = 1.0;
      let remainingValue = totalExpenses;
      
      const data = Object.keys(categoryPercentages).map((category, index, arr) => {
        // For the last category, use remaining value to ensure total is exact
        if (index === arr.length - 1) {
          return {
            category,
            value: Math.round(remainingValue)
          };
        }
        
        const percentage = categoryPercentages[category];
        const adjustedPercentage = percentage / remainingPercentage;
        const value = Math.round(remainingValue * adjustedPercentage);
        
        remainingPercentage -= percentage;
        remainingValue -= value;
        
        return {
          category,
          value
        };
      });
      
      return {
        data,
        summary: {
          totalExpenses: Math.round(totalExpenses),
          largestCategory: data.sort((a, b) => b.value - a.value)[0]
        }
      };
    } catch (error) {
      console.error('Error in getFinanceCategories service:', error);
      throw error;
    }
  }
  
  /**
   * Save a report for future reference
   * @param {Object} reportData - Report configuration and data
   * @param {String} userId - ID of user saving the report
   * @returns {Object} Saved report object
   */
  static async saveReport(reportData, userId) {
    try {
      const report = new Report({
        ...reportData,
        createdBy: userId,
        isSaved: true
      });
      
      await report.save();
      return report;
    } catch (error) {
      console.error('Error saving report:', error);
      throw error;
    }
  }
  
  /**
   * Get saved reports for a user
   * @param {String} userId - User ID
   * @param {String} type - Optional report type filter
   * @returns {Array} List of saved reports
   */
  static async getSavedReports(userId, type) {
    try {
      const query = { createdBy: userId, isSaved: true };
      if (type) query.type = type;
      
      return await Report.find(query)
        .sort({ createdAt: -1 })
        .limit(20);
    } catch (error) {
      console.error('Error getting saved reports:', error);
      throw error;
    }
  }
  
  /**
   * Delete a saved report
   * @param {String} reportId - Report ID
   * @param {String} userId - User ID (for authorization)
   * @returns {Boolean} Success indicator
   */
  static async deleteReport(reportId, userId) {
    try {
      const result = await Report.deleteOne({
        _id: reportId,
        createdBy: userId
      });
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to generate a range of dates
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Number} count - Number of points to generate
   * @returns {Array} Array of dates
   */
  static generateDateRange(startDate, endDate, count = 7) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    // For specific number of points, calculate interval
    const interval = Math.floor((end - start) / (count - 1));
    
    const dates = [];
    for (let i = 0; i < count; i++) {
      dates.push(new Date(start.getTime() + interval * i));
    }
    
    return dates;
  }
  
  /**
   * Helper method to generate a range of months
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Array of {year, month} objects
   */
  static generateMonthRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const months = [];
    const currentDate = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (currentDate <= end) {
      months.push({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth()
      });
      
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return months;
  }
}

export default ReportService;
export default ReportService;