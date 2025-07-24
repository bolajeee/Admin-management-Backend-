import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Service for sending emails
 * Provides a centralized way to send emails from the application
 */
class EmailService {
  constructor() {
    // Create a reusable transporter object using SMTP transport
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verify connection configuration
    this.verifyConnection();
  }

  /**
   * Verify connection configuration
   */
  async verifyConnection() {
    // Only verify if we have credentials
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        await this.transporter.verify();
        console.log('Email service is ready to send messages');
      } catch (error) {
        console.error('Error verifying email connection:', error);
      }
    } else {
      console.warn('Email service not configured: Missing credentials');
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @param {String|Array} options.to - Recipient(s)
   * @param {String} options.subject - Email subject
   * @param {String} options.text - Plain text body
   * @param {String} options.html - HTML body (optional)
   * @param {Array} options.attachments - Attachments (optional)
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(options) {
    try {
      // Check if email service is configured
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('Email not sent: Email service not configured');
        return { success: false, message: 'Email service not configured' };
      }

      // Set from address
      const from = process.env.EMAIL_FROM || `Admin Dashboard <${process.env.EMAIL_USER}>`;

      // Prepare email options
      const mailOptions = {
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }
  }

  /**
   * Send a password reset email
   * @param {String} to - Recipient email
   * @param {String} resetToken - Password reset token
   * @param {String} userName - User's name
   * @returns {Promise<Object>} Send result
   */
  async sendPasswordResetEmail(to, resetToken, userName) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const subject = 'Password Reset Request';
    const text = `Hi ${userName},\n\nYou requested a password reset. Please use the following link to reset your password:\n\n${resetUrl}\n\nThe link is valid for 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nRegards,\nAdmin Dashboard Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${userName},</p>
        <p>You requested a password reset. Please use the following link to reset your password:</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
            Reset Password
          </a>
        </p>
        <p>The link is valid for 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Regards,<br>Admin Dashboard Team</p>
      </div>
    `;

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send a welcome email to a new user
   * @param {String} to - Recipient email
   * @param {String} userName - User's name
   * @returns {Promise<Object>} Send result
   */
  async sendWelcomeEmail(to, userName) {
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const subject = 'Welcome to Admin Dashboard';
    const text = `Hi ${userName},\n\nWelcome to Admin Dashboard! Your account has been created successfully.\n\nYou can log in at: ${loginUrl}\n\nIf you have any questions, please contact our support team.\n\nRegards,\nAdmin Dashboard Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Admin Dashboard!</h2>
        <p>Hi ${userName},</p>
        <p>Welcome to Admin Dashboard! Your account has been created successfully.</p>
        <p>
          <a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
            Log In Now
          </a>
        </p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Regards,<br>Admin Dashboard Team</p>
      </div>
    `;

    return await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Send a notification email
   * @param {String|Array} to - Recipient email(s)
   * @param {String} subject - Email subject
   * @param {String} message - Email message
   * @param {Object} data - Additional data for the email
   * @returns {Promise<Object>} Send result
   */
  async sendNotificationEmail(to, subject, message, data = {}) {
    const text = `${message}\n\n${data.additionalText || ''}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${subject}</h2>
        <p>${message}</p>
        ${data.additionalHtml || ''}
        <p>Regards,<br>Admin Dashboard Team</p>
      </div>
    `;

    return await this.sendEmail({ to, subject, text, html });
  }
}

// Create a singleton instance
const emailService = new EmailService();

export default emailService;