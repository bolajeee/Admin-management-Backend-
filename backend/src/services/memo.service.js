
import Memo, { memoStatus, memoSeverity } from '../models/memo.model.js';
import { queryBuilder } from '../utils/queryUtils.js';

export class MemoService {
    static async getMemos(queryParams, user) {
        const {
            status,
            severity,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            search,
            userId
        } = queryParams;

        let baseQuery = {
            // Filter out deleted memos by default
            status: { $ne: 'deleted' }
        };

        // Check if user is admin - role could be populated or not
        const isAdmin = user.role?.name === 'admin' ||
            (typeof user.role === 'string' && user.role === 'admin') ||
            user.isAdmin === true;

        if (!isAdmin) {
            baseQuery.recipients = user._id;
        } else if (userId) {
            baseQuery.recipients = userId;
        }

        if (status && Object.values(memoStatus).includes(status)) {
            if (status === 'active') {
                baseQuery.$or = [
                    { expiresAt: { $gt: new Date() } },
                    { expiresAt: null }
                ];
                baseQuery.status = 'active';
            } else if (status === 'expired') {
                baseQuery.expiresAt = { $lte: new Date() };
                baseQuery.status = 'active';
            } else if (status === 'deleted') {
                // Override the default filter to show deleted memos if specifically requested
                delete baseQuery.status;
                baseQuery.status = 'deleted';
            } else {
                baseQuery.status = status;
            }
        }

        if (severity && Object.values(memoSeverity).includes(severity)) {
            baseQuery.severity = severity;
        }

        const { query, sort, skip } = queryBuilder(baseQuery, {
            search,
            searchFields: ['title', 'content'],
            sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
            page,
            limit
        });

        const [memos, total] = await Promise.all([
            Memo.find(query)
                .populate('createdBy', 'name email profilePicture')
                .populate('recipients', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Memo.countDocuments(query)
        ]);

        return {
            memos,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}
