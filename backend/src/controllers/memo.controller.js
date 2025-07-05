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
            _id: req.params.id,
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
            _id: req.params.id,
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
            _id: req.params.id,
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
            _id: req.params.id,
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
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!memo) {
            throw new NotFoundError('Memo not found or access denied');
        }

        // Only allow updates to active memos
        if (memo.status !== 'active') {
            throw new BadRequestError('Only active memos can be updated');
        }

        // Update fields if provided
        if (title) memo.title = title;
        if (content) memo.content = content;
        if (severity) memo.severity = severity;
        if (deadline) memo.deadline = new Date(deadline);
        if (expiresAt) memo.expiresAt = new Date(expiresAt);
        if (status) memo.status = status;

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
            _id: req.params.id,
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
