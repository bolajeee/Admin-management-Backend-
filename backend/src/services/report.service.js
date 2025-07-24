import User from '../models/user.model.js';
import Task from '../models/task.model.js';
import Message from '../models/message.model.js';
import Memo from '../models/memo.model.js';
import Report from '../models/report.model.js';
import cache from './cache.service.js';
/**
 * Service for generating reports
 * Contains helper methods that can be reused across different report types
 */
class ReportService {
  /**
   * Generate a range of dates for time-series reports
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Number} count - Number of data points to generate
   * @returns {Array} Array of date strings in YYYY-MM-DD format
   */
  static generateDateRange(startDate, endDate, count = 7) {
    const range = [];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    // For specific number of points, calculate interval
    const interval = Math.floor((end - start) / (count - 1));
    
    for (let i = 0; i < count; i++) {
      const date = new Date(start.getTime() + interval * i);
      range.push(date.toISOString().split('T')[0]);
    }
    
    return range;
  }
  
  /**
   * Format a date object to a human-readable string
   * @param {Date} date - Date to format
   * @returns {String} Formatted date string
   */
  static formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  /**
   * Format a number as currency
   * @param {Number} value - Value to format
   * @param {String} currency - Currency code (default: USD)
   * @returns {String} Formatted currency string
   */
  static formatCurrency(value, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(value);
  }
  
  /**
   * Calculate percentage change between two values
   * @param {Number} current - Current value
   * @param {Number} previous - Previous value
   * @returns {Number} Percentage change
   */
  static calculateTrend(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat(((current - previous) / previous * 100).toFixed(1));
  }
}

export default ReportService;