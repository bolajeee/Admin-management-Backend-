import Memo, { memoStatus, memoSeverity } from '../models/memo.model.js';
import User from '../models/user.model.js';
import { io } from '../index.js';
import NotificationService from '../services/notification.service.js';
import { MemoService } from '../services/memo.service.js';
import AuditService from '../services/audit.service.js';
import { successResponse, errorResponse } from '../utils/responseHandler.js';
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

        console.log('Backend: Creating memo with recipients:', recipients);

        // Check if user is admin
        const isAdmin = req.user.role?.name === 'admin';

        // Validate recipients - ensure we have recipients for non-broadcast memos
        if (!recipients || recipients.length === 0) {
            throw new BadRequestError('At least one recipient is required for non-broadcast memos');
        }

        // For non-admin users, ensure they can only send to themselves or their team
        if (!isAdmin) {
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

        await AuditService.createAuditLog({
            user: req.user._id,
            action: 'memo_created',
            details: { memoId: memo._id, title: memo.title }
        });

        successResponse(res, populatedMemo, 'Memo created successfully', 201);
    } catch (error) {
        errorResponse(res, error, 'Failed to create memo');
    }
};

/**
 * @desc    Get all memos (admin only)
 * @route   GET /api/memos/all
 * @access  Private/Admin
 */
export const getAllMemos = async (req, res, next) => {
    try {
        const { memos, pagination } = await MemoService.getMemos(req.query, req.user);
        successResponse(res, memos, 'Memos retrieved successfully', 200, pagination);
    } catch (error) {
        errorResponse(res, error, 'Failed to retrieve memos');
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

        await AuditService.createAuditLog({
            user: req.user._id,
            action: 'memo_broadcasted',
            details: { memoId: memo._id, title: memo.title }
        });

        successResponse(res, memo, 'Memo sent to all users', 201);
    } catch (error) {
        errorResponse(res, error, 'Failed to broadcast memo');
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
        const { memos, pagination } = await MemoService.getMemos({ ...req.query, userId }, req.user);
        successResponse(res, memos, 'Memos retrieved successfully', 200, pagination);
    } catch (error) {
        errorResponse(res, error, 'Failed to retrieve memos for user');
    }
};

/**
 * @desc    Get memos for the authenticated user
 * @route   GET /api/memos
 * @access  Private
 */
export const getUserMemos = async (req, res, next) => {
    try {
        const { memos, pagination } = await MemoService.getMemos(req.query, req.user);
        successResponse(res, memos, 'Memos retrieved successfully', 200, pagination);
    } catch (error) {
        errorResponse(res, error, 'Failed to retrieve your memos');
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

        successResponse(res, memo, 'Memo retrieved successfully');
    } catch (error) {
        errorResponse(res, error, 'Failed to retrieve memo');
    }
};

/**
 * @desc    Mark a memo as read
 * @route   PATCH /api/memos/:id/read
 * @access  Private
 */
export const markMemoAsRead = async (req, res, next) => {
    try {
        console.log('Backend: Marking memo as read:', req.params.memoId, 'by user:', req.user._id);
        const memo = await Memo.findById(req.params.memoId);

        if (!memo) {
            console.log('Backend: Memo not found:', req.params.memoId);
            throw new NotFoundError('Memo not found');
        }

        console.log('Backend: Found memo:', memo.title, 'recipients:', memo.recipients.length);

        // Check if user is admin or a recipient
        const isAdmin = req.user.role?.name === 'admin';
        const isRecipient = memo.recipients.some(recipient => recipient.equals(req.user._id));

        if (!isAdmin && !isRecipient) {
            console.log('Backend: User not a recipient and not admin. User:', req.user._id, 'Recipients:', memo.recipients);
            throw new ForbiddenError('You are not a recipient of this memo');
        }

        if (memo.readBy.some(read => read.user.equals(req.user._id))) {
            console.log('Backend: Memo already marked as read by user');
            return successResponse(res, null, 'Memo already marked as read');
        }

        memo.readBy.push({
            user: req.user._id,
            readAt: new Date()
        });

        await memo.save();
        console.log('Backend: Memo marked as read successfully');

        // Emit real-time update
        io.to(req.user.socketId).emit('memo_read', {
            memoId: memo._id,
            readBy: req.user._id
        });

        successResponse(res, null, 'Memo marked as read');
    } catch (error) {
        errorResponse(res, error, 'Failed to mark memo as read');
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
        console.log('Backend: Acknowledging memo:', req.params.memoId, 'by user:', req.user._id);

        // For admin users, find any memo. For regular users, only memos they're recipients of
        const isAdmin = req.user.role?.name === 'admin';
        const memo = isAdmin ?
            await Memo.findById(req.params.memoId) :
            await Memo.findOne({
                _id: req.params.memoId,
                recipients: req.user._id
            });

        if (!memo) {
            console.log('Backend: Memo not found or user not recipient');
            throw new NotFoundError('Memo not found or access denied');
        }

        console.log('Backend: Found memo, calling acknowledge method');
        await memo.acknowledge(req.user._id, comments);
        console.log('Backend: Memo acknowledged successfully');

        // Emit real-time update
        io.to(memo.createdBy.socketId).emit('memo_acknowledged', {
            memoId: memo._id,
            acknowledgedBy: req.user._id,
            acknowledgedAt: new Date()
        });

        successResponse(res, null, 'Memo acknowledged successfully');
    } catch (error) {
        errorResponse(res, error, 'Failed to acknowledge memo');
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
        console.log('Backend: Snoozing memo:', req.params.memoId, 'by user:', req.user._id, 'for', durationMinutes, 'minutes');

        // For admin users, find any memo. For regular users, only memos they're recipients of
        const isAdmin = req.user.role?.name === 'admin';
        const memo = isAdmin ?
            await Memo.findById(req.params.memoId) :
            await Memo.findOne({
                _id: req.params.memoId,
                recipients: req.user._id
            });

        if (!memo) {
            console.log('Backend: Memo not found or user not recipient');
            throw new NotFoundError('Memo not found or access denied');
        }

        console.log('Backend: Found memo, calling snooze method');
        await memo.snooze(req.user._id, durationMinutes, comments);
        console.log('Backend: Memo snoozed successfully');

        successResponse(res, null, `Memo snoozed for ${durationMinutes} minutes`);
    } catch (error) {
        errorResponse(res, error, 'Failed to snooze memo');
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
        console.log('Backend: Updating memo:', req.params.memoId, 'by user:', req.user._id);
        console.log('Backend: Update data:', { title, content, severity, recipients, deadline, expiresAt, status });

        const memo = await Memo.findById(req.params.memoId);

        if (!memo) {
            console.log('Backend: Memo not found');
            throw new NotFoundError('Memo not found');
        }

        // Check if user is admin or the creator
        const isAdmin = req.user.role?.name === 'admin';
        const isCreator = memo.createdBy.equals(req.user._id);

        console.log('Backend: Permission check - isAdmin:', isAdmin, 'isCreator:', isCreator);

        if (!isAdmin && !isCreator) {
            console.log('Backend: User not authorized to update memo');
            throw new ForbiddenError('You are not authorized to update this memo');
        }

        console.log('Backend: Current memo status:', memo.status);

        // Update basic fields
        if (title !== undefined) {
            console.log('Backend: Updating title from', memo.title, 'to', title);
            memo.title = title;
        }
        if (content !== undefined) {
            console.log('Backend: Updating content');
            memo.content = content;
        }
        if (severity !== undefined) {
            console.log('Backend: Updating severity from', memo.severity, 'to', severity);
            memo.severity = severity;
        }
        if (deadline !== undefined) {
            console.log('Backend: Updating deadline');
            memo.deadline = deadline ? new Date(deadline) : null;
        } else if (memo.severity !== 'low' && !memo.deadline) {
            // If severity is not low and no deadline is provided, set a default deadline
            console.log('Backend: Setting default deadline for non-low severity memo');
            memo.deadline = memo.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to 24 hours from now or expiresAt
        }
        if (expiresAt !== undefined) {
            console.log('Backend: Updating expiresAt');
            memo.expiresAt = expiresAt ? new Date(expiresAt) : null;
        } else if (memo.severity !== 'low' && !memo.expiresAt) {
            // If severity is not low and no expiresAt is provided, set a default
            console.log('Backend: Setting default expiresAt for non-low severity memo');
            memo.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to 24 hours from now
        }

        // Allow status changes
        if (status && Object.values(memoStatus).includes(status)) {
            console.log('Backend: Updating status from', memo.status, 'to', status);
            memo.status = status;
        }

        // Handle recipients update
        if (recipients && Array.isArray(recipients)) {
            console.log('Backend: Updating recipients');
            // For non-admin users, validate recipients
            if (!isAdmin) {
                const validRecipients = await User.find({
                    _id: { $in: recipients },
                    $or: [
                        { _id: req.user._id },
                        { manager: req.user._id },
                        { department: req.user.department }
                    ]
                }).select('_id');

                if (validRecipients.length !== recipients.length) {
                    console.log('Backend: Not authorized to add all specified recipients');
                    throw new ForbiddenError('Not authorized to add all specified recipients');
                }
            }

            memo.recipients = recipients;
            // Reset read status for new recipients
            memo.readBy = memo.readBy.filter(entry =>
                recipients.some(r => r.toString() === entry.user.toString())
            );
        }

        console.log('Backend: Saving memo updates');
        console.log('Backend: Memo before save:', {
            title: memo.title,
            content: memo.content,
            severity: memo.severity,
            status: memo.status,
            expiresAt: memo.expiresAt
        });

        const savedMemo = await memo.save();
        console.log('Backend: Memo updated successfully, new values:', {
            title: savedMemo.title,
            content: savedMemo.content,
            severity: savedMemo.severity,
            status: savedMemo.status,
            expiresAt: savedMemo.expiresAt
        });

        // Emit real-time update
        io.emit('memo_updated', memo);

        const populatedMemo = await memo.populate(['createdBy', 'recipients']);

        // Try to create audit log, but don't fail the request if it fails
        try {
            await AuditService.createAuditLog({
                user: req.user._id,
                action: 'memo_updated',
                details: { memoId: memo._id, title: memo.title }
            });
        } catch (auditError) {
            console.log('Backend: Audit log creation failed:', auditError.message);
        }

        console.log('Backend: Sending success response');
        successResponse(res, populatedMemo, 'Memo updated successfully');
    } catch (error) {
        errorResponse(res, error, 'Failed to update memo');
    }
};

/**
 * @desc    Delete a memo
 * @route   DELETE /api/memos/:id
 * @access  Private
 */
export const deleteMemo = async (req, res, next) => {
    try {
        console.log('Backend: Deleting memo:', req.params.memoId, 'by user:', req.user._id);
        const memo = await Memo.findById(req.params.memoId);

        if (!memo) {
            console.log('Backend: Memo not found');
            throw new NotFoundError('Memo not found');
        }

        console.log('Backend: Found memo, checking permissions. Creator:', memo.createdBy, 'User:', req.user._id, 'User role:', req.user.role?.name);

        // Check if user is admin or the creator
        const isAdmin = req.user.role?.name === 'admin';
        const isCreator = memo.createdBy.equals(req.user._id);

        if (!isAdmin && !isCreator) {
            console.log('Backend: User not authorized to delete memo');
            throw new ForbiddenError('You are not authorized to delete this memo');
        }

        // Soft delete by updating status
        console.log('Backend: Soft deleting memo');
        memo.status = 'deleted';
        await memo.save();
        console.log('Backend: Memo deleted successfully');

        // Or hard delete if needed
        // await Memo.findByIdAndDelete(req.params.id);

        // Emit real-time update
        io.emit('memo_deleted', { memoId: memo._id });

        await AuditService.createAuditLog({
            user: req.user._id,
            action: 'memo_deleted',
            details: { memoId: memo._id, title: memo.title }
        });

        successResponse(res, null, 'Memo deleted successfully');
    } catch (error) {
        errorResponse(res, error, 'Failed to delete memo');
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
                                    '$value',
                                    {
                                        $let: {
                                            vars: { sev: '$this.severity' },
                                            in: {
                                                $arrayToObject: [[
                                                    { k: '$sev', v: { $sum: ['$value.$sev', 1] } }
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

        successResponse(res, stats, 'Memo stats retrieved successfully');
    } catch (error) {
        errorResponse(res, error, 'Failed to retrieve memo stats');
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
        successResponse(res, { count }, 'Memo count retrieved successfully');
    } catch (error) {
        errorResponse(res, error, 'Internal server error');
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

        successResponse(res, result, 'Memos read over time retrieved successfully');
    } catch (error) {
        errorResponse(res, error, 'Failed to get memos read analytics');
    }
};
