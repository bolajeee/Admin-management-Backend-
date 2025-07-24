import cron from 'node-cron';
import Report from '../models/report.model.js';
import ReportService from './report.service.js';
import EmailService from './email.service.js';
import ExcelJS from 'exceljs';

/**
 * Handles scheduled report generation and delivery
 */
class ReportScheduler {
  constructor() {
    this.scheduledJobs = new Map();
  }
  
  /**
   * Initialize the scheduler and set up recurring jobs
   */
  initialize() {
    console.log('Initializing report scheduler...');
    
    // Schedule daily reports check (runs at 1:00 AM)
    cron.schedule('0 1 * * *', () => this.processScheduledReports('daily'));
    
    // Schedule weekly reports check (runs at 2:00 AM on Mondays)
    cron.schedule('0 2 * * 1', () => this.processScheduledReports('weekly'));
    
    // Schedule monthly reports check (runs at 3:00 AM on the 1st of each month)
    cron.schedule('0 3 1 * *', () => this.processScheduledReports('monthly'));
    
    console.log('Report scheduler initialized');
  }
  
  /**
   * Process scheduled reports of a specific frequency
   * @param {String} frequency - daily, weekly, or monthly
   */
  async processScheduledReports(frequency) {
    console.log(`Processing ${frequency} scheduled reports...`);
    
    try {
      // Find reports scheduled for this frequency
      const reports = await Report.find({ 
        isScheduled: true,
        'schedule.frequency': frequency
      }).populate('createdBy', 'name email');
      
      console.log(`Found ${reports.length} ${frequency} reports to process`);
      
      // Process each report
      for (const report of reports) {
        await this.generateAndSendReport(report);
      }
    } catch (error) {
      console.error(`Error processing ${frequency} reports:`, error);
    }
  }
  
  /**
   * Generate and send a scheduled report
   * @param {Object} report - Report document from database
   */
  async generateAndSendReport(report) {
    console.log(`Generating scheduled report: ${report.name}`);
    
    try {
      // Set date range based on report frequency
      const end = new Date();
      let start = new Date();
      
      switch (report.schedule.frequency) {
        case 'daily':
          start.setDate(start.getDate() - 1);
          break;
        case 'weekly':
          start.setDate(start.getDate() - 7);
          break;
        case 'monthly':
          start.setMonth(start.getMonth() - 1);
          break;
      }
      
      // Generate report data based on type
      let reportData;
      switch (report.type) {
        case 'team':
          reportData = await ReportService.getTeamPerformance(start, end);
          break;
        case 'client':
          reportData = await ReportService.getClientActivity(start, end);
          break;
        case 'finance':
          const revenueData = await ReportService.getFinanceRevenue(start, end);
          const categoriesData = await ReportService.getFinanceCategories();
          reportData = { revenue: revenueData, categories: categoriesData };
          break;
        default:
          reportData = await ReportService.getMetrics(start, end);
      }
      
      // Create Excel file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(report.name);
      
      // Add report metadata
      worksheet.addRow(['Report Name', report.name]);
      worksheet.addRow(['Report Type', report.type]);
      worksheet.addRow(['Generated On', new Date().toLocaleString()]);
      worksheet.addRow(['Date Range', `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`]);
      worksheet.addRow([]);
      
      // Add report data (simplified version - in a real implementation, you'd format this better)
      worksheet.addRow(['Report Data']);
      worksheet.addRow([JSON.stringify(reportData, null, 2)]);
      
      // Generate Excel buffer
      const buffer = await workbook.xlsx.writeBuffer();
      
      // Get recipients
      const recipients = report.schedule.recipients || [report.createdBy.email];
      
      // Send email with attachment
      await EmailService.sendEmail({
        to: recipients,
        subject: `Scheduled Report: ${report.name}`,
        text: `Your scheduled ${report.schedule.frequency} report "${report.name}" is attached.`,
        html: `<p>Your scheduled ${report.schedule.frequency} report "${report.name}" is attached.</p>
               <p>This report covers the period from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.</p>
               <p>Generated automatically by the Admin Dashboard.</p>`,
        attachments: [
          {
            filename: `${report.name.replace(/\s+/g, '-').toLowerCase()}.xlsx`,
            content: buffer
          }
        ]
      });
      
      console.log(`Scheduled report "${report.name}" sent to ${recipients.join(', ')}`);
      
      // Update the report's data property with the latest data
      report.data = reportData;
      await report.save();
    } catch (error) {
      console.error(`Error generating scheduled report "${report.name}":`, error);
    }
  }
}

// Create singleton instance
const schedulerInstance = new ReportScheduler();

export default schedulerInstance;