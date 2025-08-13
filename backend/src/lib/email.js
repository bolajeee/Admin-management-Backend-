import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendEmail = async (to, subject, html, text = '') => {
    try {
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_EMAIL}>`,
            to,
            subject,
            text,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};

export const sendNewMemoNotification = async (memo, recipient) => {
    try {
        const subject = `New Memo: ${memo.title}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>${memo.title}</h2>
                <p><strong>Severity:</strong> ${memo.severity}</p>
                <p><strong>Deadline:</strong> ${memo.deadline ? new Date(memo.deadline).toLocaleString() : 'N/A'}</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    ${memo.content}
                </div>
                <p>Please acknowledge this memo by logging into the system.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        `;

        return await sendEmail(recipient.email, subject, html);
    } catch (error) {
        console.error('Error sending memo notification:', error);
        throw error;
    }
};

export const sendTaskAssignmentNotification = async (task, assignee) => {
    try {
        const subject = `New Task Assigned: ${task.title}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>${task.title}</h2>
                <p><strong>Priority:</strong> ${task.priority}</p>
                <p><strong>Due Date:</strong> ${task.dueDate ? new Date(task.dueDate).toLocaleString() : 'Not set'}</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    ${task.description || 'No description provided.'}
                </div>
                <p>Please log in to the system to view and update this task.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        `;

        return await sendEmail(assignee.email, subject, html);
    } catch (error) {
        console.error('Error sending task assignment notification:', error);
        throw error;
    }
};

export const sendNewMessageNotification = async (message, recipient, sender) => {
    try {
        const subject = `New Message from ${sender.name}`;
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #333; margin-bottom: 20px;">You have a new message</h2>
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <img src="${sender.profilePicture || '/avatar.png'}" alt="Profile" style="width: 50px; height: 50px; border-radius: 25px; margin-right: 15px;">
                        <div>
                            <h3 style="margin: 0; color: #2c3e50;">${sender.name}</h3>
                            <p style="margin: 5px 0; color: #7f8c8d;">${sender.email}</p>
                        </div>
                    </div>
                    <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #3498db;">
                        ${message.content}
                        ${message.image ? `<div style="margin-top: 10px;"><img src="${message.image}" alt="Attached Image" style="max-width: 100%; border-radius: 5px;"></div>` : ''}
                    </div>
                    <p style="margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL}/messages/${sender._id}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reply to Message</a>
                    </p>
                </div>
                <p style="color: #95a5a6; font-size: 12px; margin-top: 20px;">This is an automated message. Please do not reply to this email.</p>
            </div>
        `;

        return await sendEmail(recipient.email, subject, html);
    } catch (error) {
        console.error('Error sending new message notification:', error);
        throw error;
    }
};
