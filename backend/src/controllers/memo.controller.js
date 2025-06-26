import Memo from '../models/memo.model.js';
import { io } from '../index.js';

// Create a new memo
export const createMemo = async (req, res) => {
    try {
        const { title, content, priority, recipients, notificationChannels, expiresAt } = req.body;
        
        const memo = new Memo({
            title,
            content,
            priority,
            recipients,
            notificationChannels,
            expiresAt,
            createdBy: req.user._id
        });
        
        await memo.save();
        await memo.populate(['createdBy', 'recipients']);
        
        // Emit real-time notification
        io.emit('new_memo', memo);
        
        // TODO: Handle email and SMS notifications based on notificationChannels
        
        res.status(201).json(memo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get memos for a user
export const getUserMemos = async (req, res) => {
    try {
        const memos = await Memo.find({
            recipients: req.user._id,
            $or: [
                { expiresAt: { $gt: new Date() } },
                { expiresAt: null }
            ]
        })
        .populate(['createdBy', 'recipients', 'readBy.user'])
        .sort({ priority: -1, createdAt: -1 });
        
        res.json(memos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mark memo as read
export const markMemoAsRead = async (req, res) => {
    try {
        const { memoId } = req.params;
        
        const memo = await Memo.findByIdAndUpdate(
            memoId,
            {
                $addToSet: {
                    readBy: {
                        user: req.user._id,
                        readAt: new Date()
                    }
                }
            },
            { new: true }
        ).populate(['createdBy', 'recipients', 'readBy.user']);
        
        if (!memo) {
            return res.status(404).json({ error: 'Memo not found' });
        }
        
        res.json(memo);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete memo
export const deleteMemo = async (req, res) => {
    try {
        const { memoId } = req.params;
        
        const memo = await Memo.findByIdAndDelete(memoId);
        
        if (!memo) {
            return res.status(404).json({ error: 'Memo not found' });
        }
        
        // Notify clients about memo deletion
        io.emit('memo_deleted', memoId);
        
        res.json({ message: 'Memo deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
