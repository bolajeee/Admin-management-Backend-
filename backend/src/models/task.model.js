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

// Recurrence sub-schema
const recurrenceSchema = new mongoose.Schema({
  frequency: {
        type: String,
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'none'
    },
  endDate: Date
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
    enum: ['todo', 'in_progress', 'blocked', 'completed', 'cancelled'],
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
  recurrence: recurrenceSchema
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
const Task = mongoose.model('Task', taskSchema);

export default Task;
