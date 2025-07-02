import mongoose from 'mongoose';

export const memoStatus = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled'
};

export const memoSeverity = {
    LOW: 'low',        // Informational (no deadline)
    MEDIUM: 'medium',  // < 24h
    HIGH: 'high',      // < 2h
    CRITICAL: 'critical' // < 30min
};

const acknowledgmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    acknowledgedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'acknowledged', 'snoozed'],
        default: 'pending'
    },
    snoozedUntil: {
        type: Date
    },
    comments: String
});

const memoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    summary: {
        type: String,
        trim: true,
        maxlength: 500
    },
    severity: {
        type: String,
        enum: Object.values(memoSeverity),
        default: memoSeverity.LOW,
        index: true
    },
    status: {
        type: String,
        enum: Object.values(memoStatus),
        default: memoStatus.ACTIVE,
        index: true
    },
    recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    expiresAt: {
        type: Date,
        required: function () {
            return this.severity !== memoSeverity.LOW;
        }
    },
    deadline: {
        type: Date,
        index: true,
        required: function () {
            return this.severity !== memoSeverity.LOW;
        },
        validate: {
            validator: function (v) {
                return !this.expiresAt || v <= this.expiresAt;
            },
            message: 'Deadline must be before or equal to expiration time'
        }
    },
    acknowledgments: [acknowledgmentSchema],
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Index for fast lookups
memoSchema.index({ status: 1, expiresAt: 1 });
memoSchema.index({ 'acknowledgments.user': 1, status: 1 });

// Add TTL index for auto-expiration
memoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook to set default expiration based on severity
memoSchema.pre('save', function (next) {
    if (this.isNew && this.severity !== memoSeverity.LOW && !this.expiresAt) {
        const now = new Date();
        switch (this.severity) {
            case memoSeverity.CRITICAL:
                this.expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
                break;
            case memoSeverity.HIGH:
                this.expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
                break;
            case memoSeverity.MEDIUM:
                this.expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
                break;
        }
    }
    next();
});

// Static method to find active memos for a user
memoSchema.statics.findActiveForUser = function (userId) {
    return this.find({
        recipients: userId,
        status: memoStatus.ACTIVE,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } }
        ]
    }).sort({ severity: -1, createdAt: -1 });
};

// Method to acknowledge a memo
memoSchema.methods.acknowledge = async function (userId, comments = '') {
    const ackIndex = this.acknowledgments.findIndex(a => a.user.equals(userId));

    if (ackIndex === -1) {
        this.acknowledgments.push({
            user: userId,
            status: 'acknowledged',
            comments
        });
    } else {
        this.acknowledgments[ackIndex].status = 'acknowledged';
        this.acknowledgments[ackIndex].acknowledgedAt = new Date();
        this.acknowledgments[ackIndex].comments = comments;
    }

    return this.save();
};

// Method to snooze a memo
memoSchema.methods.snooze = async function (userId, durationMinutes = 15, comments = '') {
    const ackIndex = this.acknowledgments.findIndex(a => a.user.equals(userId));
    const snoozeUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    if (ackIndex === -1) {
        this.acknowledgments.push({
            user: userId,
            status: 'snoozed',
            snoozedUntil: snoozeUntil,
            comments
        });
    } else {
        this.acknowledgments[ackIndex].status = 'snoozed';
        this.acknowledgments[ackIndex].snoozedUntil = snoozeUntil;
        this.acknowledgments[ackIndex].comments = comments;
    }

    return this.save();
};

const Memo = mongoose.model('Memo', memoSchema);

export default Memo;
