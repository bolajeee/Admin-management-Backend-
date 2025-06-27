import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export const sendSMS = async (to, message) => {
    if (!client) {
        console.warn('Twilio credentials not configured. SMS will not be sent.');
        return { success: false, error: 'SMS service not configured' };
    }

    try {
        const response = await client.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: to
        });
        
        console.log('SMS sent:', response.sid);
        return { success: true, sid: response.sid };
    } catch (error) {
        console.error('Error sending SMS:', error);
        return { success: false, error: error.message };
    }
};

export const sendMemoSMS = async (memo, phoneNumber) => {
    if (!phoneNumber) {
        throw new Error('Phone number is required for SMS notification');
    }

    const message = `New Memo: ${memo.title}\n` +
                   `Severity: ${memo.severity}\n` +
                   `${memo.summary || ''}\n` +
                   `Deadline: ${memo.deadline ? new Date(memo.deadline).toLocaleString() : 'N/A'}`;

    return await sendSMS(phoneNumber, message);
};

export const sendTaskAssignmentSMS = async (task, phoneNumber) => {
    if (!phoneNumber) {
        throw new Error('Phone number is required for SMS notification');
    }

    const message = `New Task: ${task.title}\n` +
                   `Priority: ${task.priority}\n` +
                   `Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}\n` +
                   `Status: ${task.status}`;

    return await sendSMS(phoneNumber, message);
};
