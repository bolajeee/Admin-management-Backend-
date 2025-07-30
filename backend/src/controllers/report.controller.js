// backend/src/controllers/report.controller.js
// Import existing dependencies plus these new ones
import fs from 'fs/promises';
import path from 'path';
import exceljs from 'exceljs';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import Report from '../models/report.model.js';

// Keep your existing controller functions and add these:

/**
 * Upload and process report data
 */
export const uploadReportData = async (req, res) => {
  try {
    console.log("Upload request received:", req.file, req.body);
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileType = path.extname(fileName).toLowerCase();
    const reportName = req.body.reportName || fileName.replace(/\.[^/.]+$/, "");
    const reportType = req.body.reportType || 'custom'; 
    let data = [];
    
    // Process file based on type
    try {
      if (fileType === '.csv') {
        // Parse CSV file
        const results = [];
        await new Promise((resolve, reject) => {
          createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve())
            .on('error', (error) => reject(error));
        });
        data = results;
      } else if (fileType === '.xlsx' || fileType === '.xls') {
        // Parse Excel file
        const workbook = new exceljs.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1);
        const headers = [];
        
        // Get headers from first row
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          headers.push(cell.value);
        });
        
        // Get data from subsequent rows
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
          const row = worksheet.getRow(rowNumber);
          const rowData = {};
          
          row.eachCell((cell, colNumber) => {
            if (colNumber <= headers.length) {
              rowData[headers[colNumber - 1]] = cell.value;
            }
          });
          
          if (Object.keys(rowData).length > 0) {
            data.push(rowData);
          }
        }
      } else {
        return res.status(400).json({ message: 'Unsupported file type' });
      }
    } catch (fileError) {
      console.error('Error processing file:', fileError);
      return res.status(400).json({ 
        message: 'Error processing file', 
        error: fileError.message 
      });
    }

    // Create new report record in database
    const report = new Report({
      name: reportName,
      type: reportType,
      filePath: filePath,
      fileType: fileType.substring(1), // remove the dot
      uploadedBy: req.user._id,
      data: data,
      columns: data.length > 0 ? Object.keys(data[0]) : [],
    });

    await report.save();

    res.status(201).json({
      message: 'Report data uploaded successfully',
      report: {
        id: report._id,
        name: report.name,
        type: report.type,
        columns: report.columns,
        rowCount: data.length,
      }
    });
    
  } catch (error) {
    console.error('Error uploading report data:', error);
    res.status(500).json({ 
      message: 'Failed to upload report data', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get list of uploaded reports
 */
export const getUploadedReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .select('name type createdAt columns rowCount')
      .populate('uploadedBy', 'name email')
      .sort('-createdAt');
    
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching uploaded reports:', error);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

/**
 * Get data from a specific report
 */
export const getReportData = async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    // Apply filtering, pagination if needed
    const { limit = 100, page = 1, sortBy, sortOrder = 'asc', ...filters } = req.query;
    
    let filteredData = report.data;
    
    // Apply filters if any
    if (Object.keys(filters).length > 0) {
      filteredData = filteredData.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          if (!item[key]) return false;
          return item[key].toString().toLowerCase().includes(value.toLowerCase());
        });
      });
    }
    
    // Apply sorting if specified
    if (sortBy && report.columns.includes(sortBy)) {
      filteredData.sort((a, b) => {
        if (sortOrder.toLowerCase() === 'desc') {
          return a[sortBy] > b[sortBy] ? -1 : 1;
        }
        return a[sortBy] > b[sortBy] ? 1 : -1;
      });
    }
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    res.status(200).json({
      report: {
        id: report._id,
        name: report.name,
        type: report.type,
        columns: report.columns,
        totalRows: report.data.length,
        filteredRows: filteredData.length
      },
      data: paginatedData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredData.length / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ message: 'Failed to fetch report data' });
  }
};

/**
 * Export report data as Excel or CSV
 */
export const exportReport = async (req, res) => {
  try {
    const { type = 'overview', format = 'xlsx' } = req.query;
    const reportData = {}; // You'll populate this based on the report type
    
    // Get relevant data based on report type
    switch (type) {
      case 'team-performance':
        // Get team performance data
        // reportData = await getTeamPerformanceData();
        break;
      case 'client-activity':
        // Get client activity data
        // reportData = await getClientActivityData();
        break;
      case 'finance/revenue':
        // Get finance revenue data
        // reportData = await getFinanceRevenueData();
        break;
      case 'finance/categories':
        // Get finance categories data
        // reportData = await getFinanceCategoriesData();
        break;
      case 'overview':
      default:
        // Get overview report data
        // reportData = await getOverviewData();
        break;
    }
    
    // Create workbook
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Report');
    
    // Add headers - this depends on your data structure
    // This is just an example
    worksheet.addRow(['Date', 'Value', 'Category']);
    
    // Add data rows - this depends on your data structure
    // This is just an example
    if (Array.isArray(reportData.data)) {
      reportData.data.forEach(item => {
        worksheet.addRow([item.date, item.value, item.category]);
      });
    }
    
    // Format cells, add styling, etc.
    worksheet.getRow(1).font = { bold: true };
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report-${type}-${Date.now()}.xlsx`);
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({
      message: 'Failed to export report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


/**
 * Get basic metrics for dashboard
 */
export const getMetrics = async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Fetch actual data from the database
    const [
      totalUsers,
      activeUsers,
      totalRevenue,
      avgSessionDuration
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      0, // Replace with actual revenue calculation if you have a model for that
      0  // Replace with actual session duration calculation if you track that
    ]);
    
    // Calculate metrics over time for trends
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (endDate - startDate) / (24 * 60 * 60 * 1000));
    
    const [currentPeriodUserCount, previousPeriodUserCount] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      User.countDocuments({ createdAt: { $gte: previousPeriodStart, $lte: startDate } })
    ]);
    
    // Calculate user growth percentage
    const userGrowth = previousPeriodUserCount === 0 ? 100 : 
      ((currentPeriodUserCount - previousPeriodUserCount) / previousPeriodUserCount) * 100;
    
    // Generate timeline data
    const timelineData = await generateTimelineData(startDate, endDate);
    
    res.status(200).json({
      totalUsers,
      activeUsers,
      totalRevenue: 15000, // Placeholder - replace with actual data
      avgSessionDuration: 20, // Placeholder - replace with actual data
      conversionRate: 3.2, // Placeholder
      userGrowth: parseFloat(userGrowth.toFixed(1)),
      timeline: timelineData
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ message: 'Failed to fetch metrics' });
  }
};

/**
 * Generate realistic timeline data using actual data where possible
 */
async function generateTimelineData(startDate, endDate) {
  const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
  const data = [];
  
  // Loop through each day in the date range
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Get actual data for this day where possible
    const [userCount, sessionCount, messageCount] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: currentDate, $lt: nextDate } }),
      // Replace with actual session data if available
      0,
      Message.countDocuments({ createdAt: { $gte: currentDate, $lt: nextDate } })
    ]);
    
    // Calculate a realistic revenue figure based on user activity
    // This is a placeholder - replace with actual revenue data if available
    const dailyRevenue = userCount * 50 + messageCount * 0.5 + Math.random() * 500;
    
    data.push({
      date: currentDate.toISOString().split('T')[0],
      users: userCount,
      revenue: parseFloat(dailyRevenue.toFixed(2)),
      sessions: sessionCount || Math.floor(userCount * 2.5 + Math.random() * 50)
    });
  }
  
  return data;
}


/**
 * Get team performance data using actual task data
 */
export const getTeamPerformance = async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Get all tasks in the date range
    const tasks = await Task.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('createdBy', 'name');
    
    // Get task completion statistics
    const completedTasks = tasks.filter(task => task.status === 'completed');
    
    const completionRate = tasks.length > 0 ? 
      (completedTasks.length / tasks.length) * 100 : 0;
    
    // Get team members
    const teamMembers = await User.find({ role: 'employee' })
      .select('_id name email');
    
    // Calculate tasks per day
    const dayCount = Math.max(1, Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000)));
    const tasksPerDay = tasks.length / dayCount;
    
    // Get task distribution by status
    const tasksByStatus = [
      { name: 'Completed', value: completedTasks.length },
      { name: 'In Progress', value: tasks.filter(task => task.status === 'in_progress').length },
      { name: 'To Do', value: tasks.filter(task => task.status === 'to do').length },
      { name: 'Blocked', value: tasks.filter(task => task.status === 'blocked').length }
    ];
    
    // Generate performance time series data
    const performanceData = await generateTeamPerformanceData(startDate, endDate, teamMembers);
    
    res.status(200).json({
      completion: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        completionRate: parseFloat(completionRate.toFixed(1)),
        trend: 5.2 // Placeholder - calculate actual trend if you have historical data
      },
      productivity: {
        averageTasksPerDay: parseFloat(tasksPerDay.toFixed(1)),
        trend: 2.1 // Placeholder
      },
      distribution: tasksByStatus,
      performance: performanceData
    });
  } catch (error) {
    console.error('Error fetching team performance:', error);
    res.status(500).json({ message: 'Failed to fetch team performance data' });
  }
};


/**
 * Generate team performance data using actual user and task data
 */
async function generateTeamPerformanceData(startDate, endDate, teamMembers) {
  const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
  const data = [];
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayData = { date: dateStr };
    
    // For each team member, find their completed tasks for this day
    for (const member of teamMembers) {
      const completedTaskCount = await Task.countDocuments({
        createdBy: member._id,
        status: 'completed',
        completedAt: { $gte: currentDate, $lt: nextDate }
      });
      
      dayData[member.name] = completedTaskCount;
    }
    
    data.push(dayData);
  }
  
  return data;
}

/**
 * Get client activity data
 */
export const getClientActivity = async (req, res) => {
  try {
    // Example implementation - replace with actual data source
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Generate sample client activity data
    const clientData = {
      activeClients: 37,
      newClients: 5,
      churnRate: 1.2,
      avgEngagementScore: 8.4,
      topClients: [
        { name: 'Acme Corp', engagementScore: 9.8, activity: 'High' },
        { name: 'Globex Inc', engagementScore: 9.3, activity: 'High' },
        { name: 'Initech', engagementScore: 8.7, activity: 'Medium' },
        { name: 'Umbrella Corp', engagementScore: 8.5, activity: 'Medium' },
      ],
      // Time series data for client activity
      activity: generateClientActivityData(startDate, endDate)
    };
    
    res.status(200).json(clientData);
  } catch (error) {
    console.error('Error fetching client activity:', error);
    res.status(500).json({ message: 'Failed to fetch client activity data' });
  }
};

/**
 * Get finance revenue data
 */
export const getFinanceRevenue = async (req, res) => {
  try {
    // Example implementation - replace with actual data source
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Generate sample finance revenue data
    const revenueData = {
      totalRevenue: 156789.45,
      comparedToPrevious: 12.3,
      averageOrderValue: 523.45,
      topProducts: [
        { name: 'Enterprise Plan', revenue: 65000 },
        { name: 'Pro Plan', revenue: 47500 },
        { name: 'Basic Plan', revenue: 28900 }
      ],
      // Time series data for revenue
      data: generateRevenueData(startDate, endDate)
    };
    
    res.status(200).json(revenueData);
  } catch (error) {
    console.error('Error fetching finance revenue:', error);
    res.status(500).json({ message: 'Failed to fetch finance revenue data' });
  }
};

/**
 * Get finance categories data
 */
export const getFinanceCategories = async (req, res) => {
  try {
    // Example implementation - replace with actual data source
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Generate sample finance categories data
    const categoriesData = {
      totalExpenses: 89450.23,
      comparedToPrevious: -5.2,
      categories: [
        { name: 'Salaries', amount: 45000, percentage: 50.3 },
        { name: 'Marketing', amount: 15000, percentage: 16.8 },
        { name: 'Operations', amount: 12500, percentage: 14.0 },
        { name: 'Infrastructure', amount: 9800, percentage: 11.0 },
        { name: 'Other', amount: 7150.23, percentage: 8.0 }
      ],
      // Time series data for expenses
      data: generateExpenseData(startDate, endDate)
    };
    
    res.status(200).json(categoriesData);
  } catch (error) {
    console.error('Error fetching finance categories:', error);
    res.status(500).json({ message: 'Failed to fetch finance categories data' });
  }
};

// Helper functions to generate sample data
// These would be replaced with actual database queries in a real implementation

/**
 * Generate client activity data
 */
function generateClientActivityData(startDate, endDate) {
  const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
  const data = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      meetings: Math.floor(Math.random() * 8),
      calls: Math.floor(Math.random() * 15),
      emails: Math.floor(10 + Math.random() * 30),
      engagement: 7 + Math.random() * 3
    });
  }
  
  return data;
}

/**
 * Generate revenue data
 */
function generateRevenueData(startDate, endDate) {
  const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
  const data = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Create some weekly patterns
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const baseValue = isWeekend ? 2000 : 5000;
    
    data.push({
      date: date.toISOString().split('T')[0],
      revenue: baseValue + Math.random() * 3000
    });
  }
  
  return data;
}

/**
 * Generate expense data
 */
function generateExpenseData(startDate, endDate) {
  const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
  const data = [];
  
  const categories = ['Salaries', 'Marketing', 'Operations', 'Infrastructure', 'Other'];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayData = { date: dateStr };
    
    // Add data for each category
    categories.forEach(category => {
      // Create some monthly patterns
      const dayOfMonth = date.getDate();
      const multiplier = dayOfMonth === 1 ? 3 : 1; // Higher expenses on the 1st of month
      
      dayData[category] = (100 + Math.random() * 200) * multiplier;
    });
    
    data.push(dayData);
  }
  
  return data;
}