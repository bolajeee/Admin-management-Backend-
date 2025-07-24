import mongoose from 'mongoose';

export const taskStatus = {
    TODO: 'todo',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    BLOCKED: 'blocked',
    CANCELLED: 'cancelled'
};

export const taskPriority = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
};

const taskActivitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true
    },
    changes: {
        type: mongoose.Schema.Types.Mixed
    },
    comment: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    _id: false
});

const taskChecklistItemSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completedAt: {
        type: Date
    }
}, {
    _id: true,
    timestamps: true
});

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: Object.values(taskStatus),
        default: taskStatus.TODO,
        index: true
    },
    priority: {
        type: String,
        enum: Object.values(taskPriority),
        default: taskPriority.MEDIUM,
        index: true
    },
    assignees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    dueDate: {
        type: Date,
        index: true
    },
    startDate: {
        type: Date,
        index: true
    },
    completedAt: {
        type: Date,
        index: true
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    estimatedHours: {
        type: Number,
        min: 0
    },
    actualHours: {
        type: Number,
        min: 0,
        default: 0
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    checklist: [taskChecklistItemSchema],
    attachments: [{
        url: String,
        name: String,
        type: String,
        size: Number,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    relatedTasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }],
    activity: [taskActivitySchema],
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes for better query performance
taskSchema.index({ assignees: 1, status: 1 });
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ status: 1, priority: -1, dueDate: 1 });
taskSchema.index({ title: 'text', description: 'text' });

// Pre-save hook to track task status changes
taskSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === taskStatus.COMPLETED && !this.completedAt) {
        this.completedAt = new Date();
    } else if (this.isModified('status') && this.status !== taskStatus.COMPLETED) {
        this.completedAt = undefined;
        this.completedBy = undefined;
    }
    next();
});

// Static method to get tasks assigned to a user
taskSchema.statics.findByAssignee = function(userId, options = {}) {
    const { status, sortBy = 'dueDate', sortOrder = 'asc' } = options;
    
    const query = { assignees: userId };
    if (status) {
        query.status = status;
    }
    
    return this.find(query)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .populate('assignees', 'name email profilePicture')
        .populate('createdBy', 'name email profilePicture');
};

// Method to add a comment to the task activity
taskSchema.methods.addComment = async function(userId, comment) {
    this.activity.push({
        user: userId,
        action: 'commented',
        comment
    });
    return this.save();
};

// Method to update task status with activity tracking
taskSchema.methods.updateStatus = async function(userId, newStatus, comment = '') {
    const oldStatus = this.status;
    this.status = newStatus;
    
    this.activity.push({
        user: userId,
        action: 'status_update',
        changes: {
            from: oldStatus,
            to: newStatus
        },
        comment
    });
    
    if (newStatus === taskStatus.COMPLETED) {
        this.completedBy = userId;
        this.completedAt = new Date();
    }
    
    return this.save();
};

// Method to calculate task progress based on checklist items
taskSchema.methods.calculateProgress = function() {
    if (!this.checklist || this.checklist.length === 0) {
        return this.status === taskStatus.COMPLETED ? 100 : 0;
    }
    const completedItems = this.checklist.filter(item => item.completed).length;
    return Math.round((completedItems / this.checklist.length) * 100);
};

const Task = mongoose.model('Task', taskSchema);

export default Task;
