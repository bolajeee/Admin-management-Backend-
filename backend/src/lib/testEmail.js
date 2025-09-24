import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_EMAIL}>`,
    to: process.env.EMAIL_USER,
    subject: 'Test Email from Nodemailer',
    text: 'This is a test email sent from your Node.js app using Nodemailer.',
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.log('Error sending test email:', error);
    }
    console.log('Test email sent:', info.response);
});
