import { io } from '../index.js';
import User from '../models/user.model.js';
import { sendEmail } from '../lib/email.js';
import { sendSMS } from '../lib/sms.js';
import { memoStatus, memoSeverity } from '../models/memo.model.js';

class NotificationService {
    static async notifyTaskAssignment(task, users) {
        if (!task) return;
        
        const usersArray = Array.isArray(users) ? users : [users];
        const userIds = usersArray.map(user => user._id.toString());

        try {
            // Send email/SMS notifications
            await this.sendTaskAssignmentNotification(task, userIds);
            
            // Send real-time socket notifications
            for (const user of usersArray) {
                if (user?.socketId) {
                    io.to(user.socketId).emit('taskAssigned', {
                        task,
                        message: `You have been assigned to task: ${task.title}`
                    });
                }
            }
        } catch (error) {
            console.error('Error in notifyTaskAssignment:', error);
        }
    }

    static async notifyTaskUpdate(task, updateType, userIds) {
        if (!task || !userIds?.length) return;

        try {
            const users = await User.find({ _id: { $in: userIds } });
            
            let message;
            switch (updateType) {
                case 'completion':
                    message = `Task "${task.title}" has been marked as complete`;
                    break;
                case 'status':
                    message = `Task "${task.title}" status has been updated to ${task.status}`;
                    break;
                default:
                    message = `Task "${task.title}" has been updated`;
            }

            for (const user of users) {
                if (user?.socketId) {
                    io.to(user.socketId).emit('taskUpdated', {
                        task,
                        updateType,
                        message
                    });
                }
            }
        } catch (error) {
            console.error('Error in notifyTaskUpdate:', error);
        }
    }

    static async sendMemoNotification(memo, userIds = []) {
        try {
            if (!memo || !userIds.length) return [];
            
            // Get users with notification preferences
            const users = await User.find({
                _id: { $in: userIds },
                isActive: true
            }).select('email phoneNumber notificationPreferences');

            const results = [];
            
            for (const user of users) {
                const prefs = user.notificationPreferences || {};
                
                // Skip if user has no notification preferences
                if (!prefs.memo) continue;
                
                // Send email notification if enabled
                if (prefs.memo.email && user.email) {
                    try {
                        const result = await sendEmail(
                            user.email,
                            `New Memo: ${memo.title}`,
                            this._formatMemoEmail(memo)
                        );
                        results.push({
                            userId: user._id,
                            type: 'email',
                            success: true,
                            messageId: result.messageId
                        });
                    } catch (error) {
                        results.push({
                            userId: user._id,
                            type: 'email',
                            success: false,
                            error: error.message
                        });
                    }
                }
                
                // Send SMS notification if enabled and it's a high/critical memo
                if (prefs.memo.sms && 
                    user.phoneNumber && 
                    [memoSeverity.HIGH, memoSeverity.CRITICAL].includes(memo.severity)) {
                    try {
                        const result = await sendSMS(
                            user.phoneNumber,
                            this._formatMemoSMS(memo)
                        );
                        results.push({
                            userId: user._id,
                            type: 'sms',
                            success: result.success,
                            sid: result.sid,
                            error: result.error
                        });
                    } catch (error) {
                        results.push({
                            userId: user._id,
                            type: 'sms',
                            success: false,
                            error: error.message
                        });
                    }
                }
            }
            
            return results;
        } catch (error) {
            console.error('Error in sendMemoNotification:', error);
            throw error;
        }
    }

    static async sendTaskAssignmentNotification(task, userIds = []) {
        try {
            if (!task || !userIds.length) return [];
            
            const users = await User.find({
                _id: { $in: userIds },
                isActive: true
            }).select('email phoneNumber notificationPreferences');

            const results = [];
            
            for (const user of users) {
                const prefs = user.notificationPreferences || {};
                
                if (prefs.taskAssignment?.email && user.email) {
                    try {
                        const result = await sendEmail(
                            user.email,
                            `New Task: ${task.title}`,
                            this._formatTaskEmail(task)
                        );
                        results.push({
                            userId: user._id,
                            type: 'email',
                            success: true,
                            messageId: result.messageId
                        });
                    } catch (error) {
                        results.push({
                            userId: user._id,
                            type: 'email',
                            success: false,
                            error: error.message
                        });
                    }
                }
                
                if (prefs.taskAssignment?.sms && user.phoneNumber) {
                    try {
                        const result = await sendSMS(
                            user.phoneNumber,
                            this._formatTaskSMS(task)
                        );
                        results.push({
                            userId: user._id,
                            type: 'sms',
                            success: result.success,
                            sid: result.sid,
                            error: result.error
                        });
                    } catch (error) {
                        results.push({
                            userId: user._id,
                            type: 'sms',
                            success: false,
                            error: error.message
                        });
                    }
                }
            }
            
            return results;
        } catch (error) {
            console.error('Error in sendTaskAssignmentNotification:', error);
            throw error;
        }
    }

    static _formatMemoEmail(memo) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>${memo.title}</h2>
                <div style="margin-bottom: 15px;">
                    <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; 
                        background-color: ${this._getSeverityColor(memo.severity)}; 
                        color: white; font-weight: bold; margin-right: 10px;">
                        ${memo.severity.toUpperCase()}
                    </span>
                    <span>${new Date(memo.createdAt).toLocaleString()}</span>
                </div>
                ${memo.summary ? `<p><strong>Summary:</strong> ${memo.summary}</p>` : ''}
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    ${memo.content}
                </div>
                ${memo.deadline ? `
                    <p><strong>Deadline:</strong> ${new Date(memo.deadline).toLocaleString()}</p>
                ` : ''}
                <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e9ecef;">
                    <p>Please acknowledge this memo by logging into the system.</p>
                    <p style="font-size: 0.9em; color: #6c757d;">This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        `;
    }

    static _formatMemoSMS(memo) {
        let message = `NEW MEMO: ${memo.title}\n\n`;
        message += `Severity: ${memo.severity.toUpperCase()}\n`;
        if (memo.summary) message += `${memo.summary}\n\n`;
        if (memo.deadline) message += `Deadline: ${new Date(memo.deadline).toLocaleString()}\n`;
        message += `\nPlease log in to acknowledge.`;
        return message;
    }

    static _formatTaskEmail(task) {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>${task.title}</h2>
                <div style="margin-bottom: 15px;">
                    <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; 
                        background-color: ${this._getPriorityColor(task.priority)}; 
                        color: white; font-weight: bold; margin-right: 10px;">
                        ${task.priority.toUpperCase()}
                    </span>
                    <span>Status: ${task.status.replace('_', ' ').toUpperCase()}</span>
                </div>
                ${task.description ? `
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        ${task.description}
                    </div>
                ` : ''}
                <div style="margin: 15px 0;">
                    ${task.dueDate ? `
                        <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleString()}</p>
                    ` : ''}
                    ${task.estimatedHours ? `
                        <p><strong>Estimated Hours:</strong> ${task.estimatedHours}</p>
                    ` : ''}
                </div>
                <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e9ecef;">
                    <p>Please log in to view and update this task.</p>
                    <p style="font-size: 0.9em; color: #6c757d;">This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        `;
    }

    static _formatTaskSMS(task) {
        let message = `NEW TASK: ${task.title}\n\n`;
        message += `Priority: ${task.priority.toUpperCase()}\n`;
        message += `Status: ${task.status.replace('_', ' ').toUpperCase()}\n`;
        if (task.dueDate) message += `Due: ${new Date(task.dueDate).toLocaleDateString()}\n`;
        if (task.estimatedHours) message += `Est. Hours: ${task.estimatedHours}\n`;
        message += `\nPlease log in for details.`;
        return message;
    }

    static _getSeverityColor(severity) {
        const colors = {
            [memoSeverity.CRITICAL]: '#dc3545', // Red
            [memoSeverity.HIGH]: '#fd7e14',    // Orange
            [memoSeverity.MEDIUM]: '#ffc107',   // Yellow
            [memoSeverity.LOW]: '#6c757d'       // Gray
        };
        return colors[severity] || '#6c757d';
    }

    static _getPriorityColor(priority) {
        const colors = {
            'urgent': '#dc3545',  // Red
            'high': '#fd7e14',    // Orange
            'medium': '#ffc107',  // Yellow
            'low': '#6c757d'      // Gray
        };
        return colors[priority] || '#6c757d';
    }
}

export default NotificationService;
