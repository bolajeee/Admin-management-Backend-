import mongoose from 'mongoose';

// Comment sub-schema
const commentSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Attachment sub-schema
const attachmentSchema = new mongoose.Schema({
  filename: String,
  mimetype: String,
  size: Number,
  url: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});


const taskSchema = new mongoose.Schema({
  title: {
        type: String,
    required: true,
    trim: true
    },
  description: {
        type: String,
    trim: true
    },
  status: {
        type: String,
    enum: ['todo', 'in-progress', 'blocked', 'completed', 'cancelled'],
    default: 'todo'
    },
  priority: {
        type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
        },
  category: {
    type: String,
    default: 'general'
  },
  dueDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  delegatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  delegatedAt: {
    type: Date
  },
  comments: [commentSchema],
  attachments: [attachmentSchema],
  linkedMemos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Memo'
  }],
  // recurrence: recurrenceSchema
}, {
  timestamps: true
    });

// Indexes for improved query performance
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ category: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ createdAt: 1 });
taskSchema.index({ 'comments.user': 1 });

// Pre-save middleware to handle task status changes
taskSchema.pre('save', async function(next) {
  const task = this;
  
  // If status is being modified
  if (task.isModified('status')) {
    // Set completedAt date when status changes to completed
    if (task.status === 'completed' && !task.completedAt) {
      task.completedAt = new Date();
    }
    // Clear completedAt if status is changed from completed to something else
    else if (task.status !== 'completed' && task.completedAt) {
      task.completedAt = undefined;
    }
  }

  next();
});

// Instance method to check if task is overdue
taskSchema.methods.isOverdue = function() {
  return this.dueDate && new Date() > this.dueDate && this.status !== 'completed';
};

// Static method to find overdue tasks
taskSchema.statics.findOverdueTasks = async function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $ne: 'completed' }
  });
};

// Static method to find tasks by status with population
taskSchema.statics.findByStatus = async function(status, populate = true) {
  let query = this.find({ status });
  
  if (populate) {
    query = query
      .populate('assignedTo', 'name email profilePicture')
      .populate('createdBy', 'name email')
      .populate('delegatedBy', 'name email');
  }
  
  return query.exec();
};

// Static method to find tasks assigned to a user
taskSchema.statics.findUserTasks = async function(userId, filters = {}) {
  const query = {
    assignedTo: userId,
    ...filters
  };

  return this.find(query)
    .populate('createdBy', 'name email profilePicture')
    .populate('delegatedBy', 'name email')
    .sort({ createdAt: -1 });
};

// Virtual for task progress
taskSchema.virtual('progress').get(function() {
  if (this.status === 'completed') return 100;
  if (this.status === 'todo') return 0;
  if (this.status === 'blocked') return this._previousProgress || 0;
  // For in-progress, calculate based on updated time vs due date
  if (this.status === 'in-progress' && this.dueDate) {
    const total = this.dueDate - this.createdAt;
    const current = Date.now() - this.createdAt;
    const progress = Math.round((current / total) * 100);
    return Math.min(Math.max(progress, 0), 99); // Cap between 0 and 99
  }
  return 0;
});

// Virtual for time until due
taskSchema.virtual('timeUntilDue').get(function() {
  if (!this.dueDate) return null;
  return this.dueDate - new Date();
});

// Method to handle task delegation
taskSchema.methods.delegate = async function(newAssigneeId, delegatorId) {
  this.assignedTo = newAssigneeId;
  this.delegatedBy = delegatorId;
  this.delegatedAt = new Date();
  return this.save();
};

// Ensure virtuals are included in JSON
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

const Task = mongoose.model('Task', taskSchema);

export default Task;
