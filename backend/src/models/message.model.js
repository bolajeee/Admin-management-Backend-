import mongoose from "mongoose";

const messageStatus = {
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed'
};

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,

    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    text: {
        type: String,
        trim: true
    },
    image: {
        type: String
    },
    status: {
        type: String,
        enum: Object.values(messageStatus),
        default: messageStatus.SENT
    },
    readAt: {
        type: Date
    },
    deliveredAt: {
        type: Date
    },
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

// Indexes for better query performance
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ status: 1 });
messageSchema.index({ createdAt: -1 });

// Static methods
messageSchema.statics.markAsDelivered = async function (messageId, receiverId) {
    return this.findOneAndUpdate(
        { _id: messageId, receiver: receiverId, status: messageStatus.SENT },
        {
            $set: {
                status: messageStatus.DELIVERED,
                deliveredAt: new Date()
            }
        },
        { new: true }
    );
};

messageSchema.statics.markAsRead = async function (messageId, receiverId) {
    return this.findOneAndUpdate(
        { _id: messageId, receiver: receiverId, status: { $in: [messageStatus.SENT, messageStatus.DELIVERED] } },
        {
            $set: {
                status: messageStatus.READ,
                readAt: new Date()
            }
        },
        { new: true }
    );
};

const Message = mongoose.model("Message", messageSchema);

export { messageStatus };
export default Message;