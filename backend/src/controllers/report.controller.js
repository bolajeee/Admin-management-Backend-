import ReportService from '../services/report.service.js';
import { BadRequestError, InternalServerError } from '../utils/errors.js';
import ExcelJS from 'exceljs';

/**
 * Get overview metrics for the dashboard
 * Provides key performance indicators for the admin dashboard
 */
export const getMetrics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Parse dates if provided
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // Get metrics from service
    const metrics = await ReportService.getMetrics(start, end);
    
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error in getMetrics controller:', error);
    next(new InternalServerError('Failed to fetch metrics data'));
  }
};

/**
 * Get team performance data
 * Shows task completion and other metrics by team member
 */
export const getTeamPerformance = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Parse dates if provided
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // Get team performance data from service
    const performanceData = await ReportService.getTeamPerformance(start, end);
    
    res.status(200).json(performanceData);
  } catch (error) {
    console.error('Error in getTeamPerformance controller:', error);
    next(new InternalServerError('Failed to fetch team performance data'));
  }
};

/**
 * Get client activity data
 * Shows client interactions and responses over time
 */
export const getClientActivity = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Parse dates if provided
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // Get client activity data from service
    const activityData = await ReportService.getClientActivity(start, end);
    
    res.status(200).json(activityData);
  } catch (error) {
    console.error('Error in getClientActivity controller:', error);
    next(new InternalServerError('Failed to fetch client activity data'));
  }
};

/**
 * Get financial revenue data
 * Shows revenue trends over time
 */
export const getFinanceRevenue = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Parse dates if provided
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // Get revenue data from service
    const revenueData = await ReportService.getFinanceRevenue(start, end);
    
    res.status(200).json(revenueData);
  } catch (error) {
    console.error('Error in getFinanceRevenue controller:', error);
    next(new InternalServerError('Failed to fetch financial revenue data'));
  }
};

/**
 * Get financial expense categories data
 * Shows expense distribution by category
 */
export const getFinanceCategories = async (req, res, next) => {
  try {
    // Get expense categories data from service
    const categoriesData = await ReportService.getFinanceCategories();
    
    res.status(200).json(categoriesData);
  } catch (error) {
    console.error('Error in getFinanceCategories controller:', error);
    next(new InternalServerError('Failed to fetch financial categories data'));
  }
};

/**
 * Save a report configuration
 * Allows users to save their custom reports for future reference
 */
export const saveReport = async (req, res, next) => {
  try {
    const { type, name, dateRange, filters, visualization } = req.body;
    
    // Validate required fields
    if (!type || !name) {
      return next(new BadRequestError('Report type and name are required'));
    }
    
    // Save the report
    const report = await ReportService.saveReport({
      type,
      name,
      dateRange,
      filters,
      visualization
    }, req.user.userId);
    
    res.status(201).json({ 
      message: 'Report saved successfully',
      report 
    });
  } catch (error) {
    console.error('Error in saveReport controller:', error);
    next(new InternalServerError('Failed to save report'));
  }
};

/**
 * Get saved reports for the current user
 */
export const getSavedReports = async (req, res, next) => {
  try {
    const { type } = req.query;
    
    // Get saved reports from service
    const reports = await ReportService.getSavedReports(req.user.userId, type);
    
    res.status(200).json({ reports });
  } catch (error) {
    console.error('Error in getSavedReports controller:', error);
    next(new InternalServerError('Failed to fetch saved reports'));
  }
};

/**
 * Delete a saved report
 */
export const deleteReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    
    // Delete the report
    const success = await ReportService.deleteReport(reportId, req.user.userId);
    
    if (!success) {
      return next(new BadRequestError('Report not found or you do not have permission to delete it'));
    }
    
    res.status(200).json({ 
      message: 'Report deleted successfully' 
    });
  } catch (error) {
    console.error('Error in deleteReport controller:', error);
    next(new InternalServerError('Failed to delete report'));
  }
};

/**
 * Export report as Excel file
 * Generates a downloadable Excel file with report data
 */
export const exportReport = async (req, res, next) => {
  try {
    const { type } = req.query;
    const { startDate, endDate } = req.query;
    
    // Parse dates if provided
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Admin Dashboard';
    workbook.created = new Date();
    
    // Format the report title
    const reportTitle = type.charAt(0).toUpperCase() + type.slice(1) + ' Report';
    const worksheet = workbook.addWorksheet(reportTitle);
    
    // Add report metadata
    worksheet.addRow(['Report Type', reportTitle]);
    worksheet.addRow(['Generated On', new Date().toLocaleString()]);
    worksheet.addRow(['Date Range', 
      `${start ? start.toLocaleDateString() : 'All time'} to ${end ? end.toLocaleDateString() : 'Present'}`
    ]);
    worksheet.addRow([]);  // Empty row
    
    // Generate different report content based on the type
    if (type === 'team') {
      // Get team performance data
      const { performance, timeline, totalTasks, topPerformer } = await ReportService.getTeamPerformance(start, end);
      
      // Add summary section
      worksheet.addRow(['Summary']);
      worksheet.addRow(['Total Tasks Completed', totalTasks]);
      worksheet.addRow(['Top Performer', topPerformer || 'N/A']);
      worksheet.addRow([]);  // Empty row
      
      // Add performance by employee
      worksheet.addRow(['Employee Performance']);
      worksheet.addRow(['Employee Name', 'Tasks Completed']);
      
      performance.forEach(emp => {
        worksheet.addRow([emp.name, emp.value]);
      });
      
      worksheet.addRow([]);  // Empty row
      
      // Add timeline data
      worksheet.addRow(['Daily Task Completion']);
      worksheet.addRow(['Date', 'Tasks Completed']);
      
      timeline.forEach(day => {
        worksheet.addRow([day.date, day.count]);
      });
    } 
    else if (type === 'clients') {
      // Get client activity data
      const { activity, summary } = await ReportService.getClientActivity(start, end);
      
      // Add summary section
      worksheet.addRow(['Summary']);
      worksheet.addRow(['Total Interactions', summary.totalInteractions]);
      worksheet.addRow(['Total Responses', summary.totalResponses]);
      worksheet.addRow(['Average Response Rate', `${summary.avgResponseRate}%`]);
      worksheet.addRow(['Average Response Time', summary.responseTime]);
      worksheet.addRow([]);  // Empty row
      
      // Add daily activity
      worksheet.addRow(['Daily Activity']);
      worksheet.addRow(['Date', 'Interactions', 'Responses']);
      
      activity.forEach(day => {
        worksheet.addRow([day.date, day.interactions, day.responses]);
      });
    } 
    else if (type === 'finance') {
      // Get revenue data
      const revenueData = await ReportService.getFinanceRevenue(start, end);
      
      // Get expense data
      const expenseData = await ReportService.getFinanceCategories();
      
      // Add revenue summary
      worksheet.addRow(['Revenue Summary']);
      worksheet.addRow(['Total Revenue', `$${revenueData.summary.totalRevenue.toLocaleString()}`]);
      worksheet.addRow(['Average Monthly Revenue', `$${Math.round(revenueData.summary.avgMonthlyRevenue).toLocaleString()}`]);
      worksheet.addRow(['Growth Rate', `${revenueData.summary.growthRate}%`]);
      worksheet.addRow([]);  // Empty row
      
      // Add monthly revenue
      worksheet.addRow(['Monthly Revenue']);
      worksheet.addRow(['Month', 'Revenue', 'Tasks Completed']);
      
      revenueData.data.forEach(month => {
        worksheet.addRow([month.period, `$${month.value.toLocaleString()}`, month.tasks]);
      });
      
      worksheet.addRow([]);  // Empty row
      
       // Add expense summary
      worksheet.addRow(['Expense Summary']);
      worksheet.addRow(['Total Expenses', `$${expenseData.summary.totalExpenses.toLocaleString()}`]);
      worksheet.addRow(['Largest Expense Category', 
        `${expenseData.summary.largestCategory.category}: $${expenseData.summary.largestCategory.value.toLocaleString()}`
      ]);
      worksheet.addRow([]);  // Empty row

      // Add expense categories
      worksheet.addRow(['Expense Categories']);
      worksheet.addRow(['Category', 'Amount', 'Percentage of Total']);
    
      expenseData.data.forEach(category => {
        const percentage = ((category.value / expenseData.summary.totalExpenses) * 100).toFixed(1);
        worksheet.addRow([
          category.category,
          `$${category.value.toLocaleString()}`,
          `${percentage}%`
        ]);
      });

      // Add profit calculation
      worksheet.addRow([]);  // Empty row
      worksheet.addRow(['Profit Analysis']);
      worksheet.addRow(['Total Revenue', `$${revenueData.summary.totalRevenue.toLocaleString()}`]);
      worksheet.addRow(['Total Expenses', `$${expenseData.summary.totalExpenses.toLocaleString()}`]);

      const profit = revenueData.summary.totalRevenue - expenseData.summary.totalExpenses;
      const profitMargin = ((profit / revenueData.summary.totalRevenue) * 100).toFixed(1);

      worksheet.addRow(['Net Profit', `$${profit.toLocaleString()}`]);
      worksheet.addRow(['Profit Margin', `${profitMargin}%`]);
    }
    else if (type === 'overview') {
      // Get all the data for an overview report
      const metrics = await ReportService.getMetrics(start, end);
      const teamData = await ReportService.getTeamPerformance(start, end);
      const clientData = await ReportService.getClientActivity(start, end);
      const revenueData = await ReportService.getFinanceRevenue(start, end);

      // Add key metrics
      worksheet.addRow(['Key Performance Indicators']);
      worksheet.addRow(['Metric', 'Value', 'Trend vs Previous Period']);
      worksheet.addRow(['Team Productivity', metrics.productivity.toFixed(1), `${metrics.productivityTrend}%`]);
      worksheet.addRow(['Client Satisfaction', `${metrics.satisfaction}%`, `${metrics.satisfactionTrend}%`]);
      worksheet.addRow(['Revenue', `$${metrics.revenue.toLocaleString()}`, `${metrics.revenueTrend}%`]);
      worksheet.addRow(['Cost Efficiency', `${metrics.costEfficiency}%`, `${metrics.costEfficiencyTrend}%`]);

      worksheet.addRow([]);  // Empty row

      // Add team summary
      worksheet.addRow(['Team Summary']);
      worksheet.addRow(['Total Tasks Completed', teamData.totalTasks]);
      worksheet.addRow(['Top Performer', teamData.topPerformer || 'N/A']);

      worksheet.addRow([]);  // Empty row

      // Add client summary
      worksheet.addRow(['Client Engagement Summary']);
      worksheet.addRow(['Total Interactions', clientData.summary.totalInteractions]);
      worksheet.addRow(['Response Rate', `${clientData.summary.avgResponseRate}%`]);

      worksheet.addRow([]);  // Empty row

      // Add financial summary
      worksheet.addRow(['Financial Summary']);
      worksheet.addRow(['Total Revenue', `$${revenueData.summary.totalRevenue.toLocaleString()}`]);
      worksheet.addRow(['Growth Rate', `${revenueData.summary.growthRate}%`]);
    }
    else {
      // Generic report for other types
      worksheet.addRow(['Note: Detailed export for this report type is not yet available.']);
      worksheet.addRow(['Please select "team", "clients", "finance", or "overview" report types.']);
    }

    // Apply some styling
    worksheet.columns.forEach(column => {
      column.width = 20;
    });

    // Set header row styles
    worksheet.getRow(5).font = { bold: true };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error in exportReport controller:', error);
    next(new InternalServerError('Failed to export report'));
  }
};
