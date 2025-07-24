import mongoose from 'mongoose';

/**
 * Report Schema
 * Stores information about saved reports and report templates
 * Allows users to save custom reports for future reference
 */
const reportSchema = new mongoose.Schema({
  // Type of report (team performance, client activity, financial, etc.)
  type: {
    type: String,
    required: true,
    enum: ['team', 'client', 'finance', 'custom'],
    index: true // Index for faster queries
  },
  
  // User-friendly name for the report
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // User who created this report
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Index for faster user-specific queries
  },
  
  // Time range for the report data
  dateRange: {
    start: Date,
    end: Date
  },
  
  // Actual report data (can be any structure based on report type)
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Any filters applied to the report
  filters: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Whether this is a saved report or a one-time generation
  isSaved: {
    type: Boolean,
    default: false
  },
  
  // Whether this report should run on a schedule
  isScheduled: {
    type: Boolean,
    default: false
  },
  
  // How often to run the report if scheduled (daily, weekly, monthly)
  schedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'monthly'
    },
    dayOfWeek: Number, // 0-6 for weekly reports (0 is Sunday)
    dayOfMonth: Number, // 1-31 for monthly reports
    recipients: [String] // Email addresses to send the report to
  },
  
  // Description of what this report shows
  description: {
    type: String,
    trim: true
  },
  
  // Visual customization options
  visualization: {
    chartType: {
      type: String,
      enum: ['bar', 'line', 'pie', 'area', 'radar'],
      default: 'bar'
    },
    colors: [String], // Custom color scheme
    showLegend: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Index for finding reports in a date range
reportSchema.index({ 'dateRange.start': 1, 'dateRange.end': 1 });

// Compound index for finding a user's reports of a specific type
reportSchema.index({ createdBy: 1, type: 1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;