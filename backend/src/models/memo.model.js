import mongoose from 'mongoose';

const memoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ['normal', 'high', 'urgent'],
        default: 'normal'
    },
    recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    notificationChannels: [{
        type: String,
        enum: ['in-app', 'email', 'sms'],
        default: ['in-app']
    }],
    expiresAt: {
        type: Date
    },
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

const Memo = mongoose.model('Memo', memoSchema);

export default Memo;
