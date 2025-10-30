// Get all users (admin only)
import { successResponse, errorResponse } from '../utils/responseHandler.js';
import User from '../models/user.model.js';

export const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, role, isActive, search } = req.query;

        // Build query
        let query = {};
        if (role) query.role = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;
        const total = await User.countDocuments(query);

        // Fetch users with populated role
        const users = await User.find(query, 'name email role isActive settings team createdAt')
            .populate('role', 'name permissions')
            .populate('team', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        };

        return successResponse(res, { users, pagination });
    } catch (error) {
        return errorResponse(res, error, 'Failed to fetch users');
    }
};
// backend/src/controllers/admin.controller.js
export const getSuggestedActions = (req, res) => {
    // You can make this dynamic based on user role, stats, etc.
    const actions = [
        { label: "Create Company Wide Memo", action: "create_memo", route: "/memos/broadcast" },
        { label: "Create Task", action: "create_task" },
        { label: "Add Employee", action: "add_employee", route: "/admin/employees" },
        { label: "View Reports", action: "view_reports", route: "/admin/reports" },
    ];
    res.json({ actions });
};