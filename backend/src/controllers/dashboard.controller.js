import User from "../models/user.model.js";
import Memo from "../models/memo.model.js";
import Task from "../models/task.model.js";
import Message from "../models/message.model.js";

export const getDashboardStats = async (req, res) => {
    try {
        const [employeeCount, memoCount, taskCount, messageCount] = await Promise.all([
            User.countDocuments({ role: "employee" }),
            Memo.countDocuments(),
            Task.countDocuments(),
            Message.countDocuments()
        ]);
        res.status(200).json({
            employees: employeeCount,
            memos: memoCount,
            tasks: taskCount,
            messages: messageCount
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
};