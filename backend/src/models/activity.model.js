import mongoose from 'mongoose';

/**
 * User Activity Schema
 * Tracks user actions for analytics and reporting
 */
const activitySchema = new mongoose.Schema({
  // User who performed the action
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Type of action (login, task-complete, message-send, etc.)
  action: {
    type: String,
    required: true,
    index: true
  },
  
  // Additional details about the action
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // IP address of the user
  ipAddress: String,
  
  // User agent (browser/device info)
  userAgent: String,
  
  // If the action relates to a specific resource
  resourceType: {
    type: String,
    index: true
  },
  
  // ID of the related resource
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for user actions within a timeframe
activitySchema.index({ user: 1, action: 1, createdAt: -1 });

// TTL index to automatically delete old activity records after 90 days
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;