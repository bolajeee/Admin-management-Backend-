import User from '../models/user.model.js';
import Memo from '../models/memo.model.js';
import Task from '../models/task.model.js';
import Message from '../models/message.model.js';
import Role from '../models/role.model.js';

export class DashboardService {
    static async getDashboardStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const employeeRole = await Role.findOne({ name: "employee" });

        const [
            employeeCount,
            memoCount,
            activeTaskCount,
            completedTaskCount,
            todayMessageCount,
            totalMessageCount
        ] = await Promise.all([
            User.countDocuments({ role: employeeRole._id }),
            Memo.countDocuments({ status: "active" }),
            Task.countDocuments({ status: { $in: ["todo", "in-progress"] } }),
            Task.countDocuments({ status: "completed" }),
            Message.countDocuments({
                createdAt: {
                    $gte: today,
                    $lt: tomorrow
                }
            }),
            Message.countDocuments()
        ]);

        return {
            employees: employeeCount,
            memos: memoCount,
            tasks: activeTaskCount,
            completedTasks: completedTaskCount,
            messagesToday: todayMessageCount,
            totalMessages: totalMessageCount
        };
    }

    static async getRecentActivity(limit = 20) {
        const [recentUsers, recentTasks, recentMemos, recentMessages] = await Promise.all([
            User.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('name email createdAt role'),
            Task.find()
                .sort({ updatedAt: -1 })
                .limit(5)
                .select('title status updatedAt createdBy')
                .populate('createdBy', 'name'),
            Memo.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('title createdAt createdBy')
                .populate('createdBy', 'name'),
            Message.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select('content createdAt sender')
                .populate('sender', 'name')
        ]);

        const activities = [
            ...this.mapUsersToActivity(recentUsers),
            ...this.mapTasksToActivity(recentTasks),
            ...this.mapMemosToActivity(recentMemos),
            ...this.mapMessagesToActivity(recentMessages)
        ];

        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return activities.slice(0, limit);
    }

     static mapUsersToActivity(users) {
        return users.map(user => ({
            type: 'user',
            description: `New user registered: ${user.name || user.email}`,
            timestamp: user.createdAt,
            meta: { role: user.role }
        }));
    }

     static mapTasksToActivity(tasks) {
        return tasks.map(task => ({
            type: 'task',
            description: `Task "${task.title}" ${task.status === 'completed' ? 'completed' : 'updated'} by ${task.createdBy?.name || 'Unknown'}`,
            timestamp: task.updatedAt,
            meta: { status: task.status }
        }));
    }

     static mapMemosToActivity(memos) {
        return memos.map(memo => ({
            type: 'memo',
            description: `Memo sent: "${memo.title}" by ${memo.createdBy?.name || 'Unknown'}`,
            timestamp: memo.createdAt
        }));
    }

     static mapMessagesToActivity(messages) {
        return messages.map(message => ({
            type: 'message',
            description: `Message sent by ${message.sender?.name || 'Unknown'}`,
            timestamp: message.createdAt,
            meta: { content: message.content }
        }));
    }
}
