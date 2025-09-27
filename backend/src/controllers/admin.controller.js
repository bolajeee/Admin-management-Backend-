// Get all users (admin only)
import User from '../models/user.model.js';
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, 'name email role isActive settings');
        res.json({ users });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users', error: error.message });
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