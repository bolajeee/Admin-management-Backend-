import Memo, { memoStatus, memoSeverity } from '../models/memo.model.js';
import User from '../models/user.model.js';
import { io } from '../index.js';
import NotificationService from '../services/notification.service.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';

/**
 * @desc    Create a new memo
 * @route   POST /api/memos
 * @access  Private
 */
export const createMemo = async (req, res, next) => {
    try {
        const {
            title,
            content,
            summary = '',
            severity = memoSeverity.LOW,
            recipients = [],
            deadline,
            expiresAt,
            metadata = {}
        } = req.body;

        // Validate recipients
        if (recipients.length === 0 && req.user.role !== 'admin') {
            throw new BadRequestError('At least one recipient is required');
        }

        // For non-admin users, ensure they can only send to themselves or their team
        if (req.user.role !== 'admin') {
            const validRecipients = await User.find({
                _id: { $in: recipients },
                $or: [
                    { _id: req.user._id },
                    { manager: req.user._id },
                    { department: req.user.department }
                ]
            }).select('_id');

            if (validRecipients.length !== recipients.length) {
                throw new ForbiddenError('Not authorized to send memos to all specified recipients');
            }
        }

        const memo = new Memo({
            title,
            content,
            summary,
            severity,
            recipients,
            createdBy: req.user._id,
            deadline: deadline ? new Date(deadline) : null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            metadata
        });

        await memo.save();

        // Populate the created memo with user data
        const populatedMemo = await Memo.findById(memo._id)
            .populate('createdBy', 'name email profilePicture')
            .populate('recipients', 'name email socketId notificationPreferences');

        // Send real-time notifications to online users
        const onlineRecipients = populatedMemo.recipients.filter(
            user => user.socketId
        );

        onlineRecipients.forEach(user => {
            io.to(user.socketId).emit('new_memo', populatedMemo);
        });

        // Send email/SMS notifications
        await NotificationService.sendMemoNotification(
            populatedMemo,
            populatedMemo.recipients.map(r => r._id)
        );

        res.status(201).json({
            success: true,
            data: populatedMemo
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all memos (admin only)
 * @route   GET /api/memos/all
 * @access  Private/Admin
 */
export const getAllMemos = async (req, res, next) => {
    try {
        const {
            status,
            severity,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search
        } = req.query;

        const query = {};

        if (status && Object.values(memoStatus).includes(status)) {
            query.status = status;
        }
        if (severity && Object.values(memoSeverity).includes(severity)) {
            query.severity = severity;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        const [memos, total] = await Promise.all([
            Memo.find(query)
                .populate('createdBy', 'name email profilePicture')
                .populate('recipients', 'name email')
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit)),
            Memo.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: memos,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create a memo for every user (admin only)
 * @route   POST /api/memos/broadcast
 * @access  Private/Admin
 */
export const createMemoForAllUsers = async (req, res, next) => {
    try {
        const { title, content, summary = '', severity = memoSeverity.LOW, deadline, expiresAt, metadata = {} } = req.body;

        // Only admin can broadcast
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Only admin can broadcast memos.' });
        }

        // Get all user IDs
        const users = await User.find({}, '_id');
        const recipientIds = users.map(u => u._id);

        const memo = new Memo({
            title,
            content,
            summary,
            severity,
            recipients: recipientIds,
            createdBy: req.user._id,
            deadline: deadline ? new Date(deadline) : null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            metadata
        });

        await memo.save();

        res.status(201).json({
            success: true,
            data: memo,
            message: "Memo sent to all users"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get memos for a specific user (admin only)
 * @route   GET /api/memos/user/:userId
 * @access  Private/Admin
 */
export const getMemosForUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const {
            status,
            severity,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search
        } = req.query;

        const query = { recipients: userId };

        if (status && Object.values(memoStatus).includes(status)) {
            query.status = status;
        }
        if (severity && Object.values(memoSeverity).includes(severity)) {
            query.severity = severity;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        const [memos, total] = await Promise.all([
            Memo.find(query)
                .populate('createdBy', 'name email profilePicture')
                .populate('recipients', 'name email')
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit)),
            Memo.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: memos,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get memos for the authenticated user
 * @route   GET /api/memos
 * @access  Private
 */
export const getUserMemos = async (req, res, next) => {
    try {
        const {
            status = 'active',
            severity,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search
        } = req.query;

        // Validate status
        if (!Object.values(memoStatus).includes(status)) {
            throw new BadRequestError('Invalid status value');
        }

        // Build query
        const query = { recipients: req.user._id };

        // Filter by status
        if (status === 'active') {
            query.$or = [
                { expiresAt: { $gt: new Date() } },
                { expiresAt: null }
            ];
            query.status = 'active';
        } else if (status === 'expired') {
            query.expiresAt = { $lte: new Date() };
            query.status = 'active';
        } else {
            query.status = status;
        }

        // Filter by severity
        if (severity && Object.values(memoSeverity).includes(severity)) {
            query.severity = severity;
        }

        // Search by title or content
        if (search) {
            query.$or = [
                ...(query.$or || []),
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        // Execute query with pagination
        const [memos, total] = await Promise.all([
            Memo.find(query)
                .populate('createdBy', 'name email profilePicture')
                .populate('recipients', 'name email')
                .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit)),
            Memo.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: memos,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get a single memo by ID
 * @route   GET /api/memos/:id
 * @access  Private
 */
export const getMemoById = async (req, res, next) => {
    try {
        const memo = await Memo.findOne({
            _id: req.params.memoId,
            $or: [
                { recipients: req.user._id },
                { createdBy: req.user._id }
            ]
        })
            .populate('createdBy', 'name email profilePicture')
            .populate('recipients', 'name email')
            .populate('acknowledgments.user', 'name email profilePicture');

        if (!memo) {
            throw new NotFoundError('Memo not found or access denied');
        }

        res.json({
            success: true,
            data: memo
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mark a memo as read
 * @route   PATCH /api/memos/:id/read
 * @access  Private
 */
export const markMemoAsRead = async (req, res, next) => {
    try {
        const memo = await Memo.findOne({
            _id: req.params.memoId,
            recipients: req.user._id,
            'readBy.user': { $ne: req.user._id }
        });

        if (!memo) {
            throw new NotFoundError('Memo not found or already marked as read');
        }

        memo.readBy.push({
            user: req.user._id,
            readAt: new Date()
        });

        await memo.save();

        // Emit real-time update
        io.to(req.user.socketId).emit('memo_read', {
            memoId: memo._id,
            readBy: req.user._id
        });

        res.json({
            success: true,
            message: 'Memo marked as read'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Acknowledge a memo
 * @route   PATCH /api/memos/:id/acknowledge
 * @access  Private
 */
export const acknowledgeMemo = async (req, res, next) => {
    try {
        const { comments = '' } = req.body;

        const memo = await Memo.findOne({
            _id: req.params.memoId,
            recipients: req.user._id
        });

        if (!memo) {
            throw new NotFoundError('Memo not found or access denied');
        }

        await memo.acknowledge(req.user._id, comments);

        // Emit real-time update
        io.to(memo.createdBy.socketId).emit('memo_acknowledged', {
            memoId: memo._id,
            acknowledgedBy: req.user._id,
            acknowledgedAt: new Date()
        });

        res.json({
            success: true,
            message: 'Memo acknowledged successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Snooze a memo
 * @route   PATCH /api/memos/:id/snooze
 * @access  Private
 */
export const snoozeMemo = async (req, res, next) => {
    try {
        const { durationMinutes = 15, comments = '' } = req.body;

        const memo = await Memo.findOne({
            _id: req.params.memoId,
            recipients: req.user._id
        });

        if (!memo) {
            throw new NotFoundError('Memo not found or access denied');
        }

        await memo.snooze(req.user._id, durationMinutes, comments);

        res.json({
            success: true,
            message: `Memo snoozed for ${durationMinutes} minutes`
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update a memo
 * @route   PUT /api/memos/:id
 * @access  Private
 */
export const updateMemo = async (req, res, next) => {
    try {
        const { title, content, severity, recipients, deadline, expiresAt, status } = req.body;

        const memo = await Memo.findOne({
            _id: req.params.memoId,
            createdBy: req.user._id
        });

        if (!memo) {
            throw new NotFoundError('Memo not found or access denied');
        }

        // Allow status changes even if the memo is not currently `active`
        if (status && Object.values(memoStatus).includes(status)) {
            memo.status = status;
        }

        // Only allow other fields to be updated if the memo is `active`
        if (memo.status === 'active') {
            if (title) memo.title = title;
            if (content) memo.content = content;
            if (severity) memo.severity = severity;
            if (deadline) memo.deadline = new Date(deadline);
            if (expiresAt) memo.expiresAt = new Date(expiresAt);
        }

        // Handle recipients update
        if (recipients && Array.isArray(recipients)) {
            // For non-admin users, validate recipients
            if (req.user.role !== 'admin') {
                const validRecipients = await User.find({
                    _id: { $in: recipients },
                    $or: [
                        { _id: req.user._id },
                        { manager: req.user._id },
                        { department: req.user.department }
                    ]
                }).select('_id');

                if (validRecipients.length !== recipients.length) {
                    throw new ForbiddenError('Not authorized to add all specified recipients');
                }
            }

            memo.recipients = recipients;
            // Reset read status for new recipients
            memo.readBy = memo.readBy.filter(entry =>
                recipients.some(r => r.toString() === entry.user.toString())
            );
        }

        await memo.save();

        // Emit real-time update
        io.emit('memo_updated', memo);

        res.json({
            success: true,
            data: await memo.populate(['createdBy', 'recipients'])
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a memo
 * @route   DELETE /api/memos/:id
 * @access  Private
 */
export const deleteMemo = async (req, res, next) => {
    try {
        const memo = await Memo.findOne({
            _id: req.params.memoId,
            createdBy: req.user._id
        });

        if (!memo) {
            throw new NotFoundError('Memo not found or access denied');
        }

        // Soft delete by updating status
        memo.status = 'deleted';
        await memo.save();

        // Or hard delete if needed
        // await Memo.findByIdAndDelete(req.params.id);

        // Emit real-time update
        io.emit('memo_deleted', { memoId: memo._id });

        res.json({
            success: true,
            message: 'Memo deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get memo statistics
 * @route   GET /api/memos/stats
 * @access  Private
 */
export const getMemoStats = async (req, res, next) => {
    try {
        const stats = await Memo.aggregate([
            {
                $match: {
                    $or: [
                        { recipients: req.user._id },
                        { createdBy: req.user._id }
                    ]
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    bySeverity: {
                        $push: {
                            severity: '$severity',
                            count: 1
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    status: '$_id',
                    count: 1,
                    bySeverity: {
                        $reduce: {
                            input: '$bySeverity',
                            initialValue: {},
                            in: {
                                $mergeObjects: [
                                    '$$value',
                                    {
                                        $let: {
                                            vars: { sev: '$$this.severity' },
                                            in: {
                                                $arrayToObject: [[
                                                    { k: '$$sev', v: { $sum: ['$$value.$$sev', 1] } }
                                                ]]
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get memo count
 * @route   GET /api/memos/count
 * @access  Private
 */
export const getMemoCount = async (req, res) => {
    try {
        const count = await Memo.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Get number of memos read per day for the last 30 days
 * @route GET /api/memos/analytics/read
 * @access Private/Admin
 */
export const getMemosReadOverTime = async (req, res) => {
    try {
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - 29); // last 30 days including today
        startDate.setHours(0, 0, 0, 0);

        const data = await Memo.aggregate([
            { $unwind: '$readBy' },
            { $match: { 'readBy.readAt': { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$readBy.readAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in days with zero if missing
        const result = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = date.toISOString().slice(0, 10);
            const found = data.find(d => d._id === dateStr);
            result.push({ date: dateStr, count: found ? found.count : 0 });
        }

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error getting memos read over time:', error);
        res.status(500).json({ message: 'Failed to get memos read analytics' });
    }
};
