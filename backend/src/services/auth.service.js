import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import { sendEmail } from '../lib/email.js';

class AuthService {
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  static async comparePasswords(plainPassword, hashedPassword) {
    console.log('comparePasswords: plainPassword', plainPassword);
    console.log('comparePasswords: hashedPassword', hashedPassword);
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async createUserWithRole(userData) {
    const { name, email, role, password } = userData;
    
    let userRole = await Role.findOne({ name: role || 'employee' });
    if (!userRole) {
      userRole = await Role.create({ name: role || 'employee', permissions: [] });
    }

    // Set default password based on role if not provided
    const defaultPassword = password || (userRole.name === 'admin' ? 'admin' : 'employee');
    const hashedPassword = await this.hashPassword(defaultPassword);

    const user = new User({
      name,
      email,
      role: userRole._id,
      password: hashedPassword
    });

    await user.save();
    return user.populate('role');
  }

  static getDefaultPassword(role) {
    return role.name === 'admin' ? 'admin' : 'employee';
  }

  static async resetUserPassword(userId) {
    const user = await User.findById(userId).populate('role');
    if (!user) return null;

    const defaultPassword = this.getDefaultPassword(user.role);
    user.password = await this.hashPassword(defaultPassword);
    return await user.save();
  }

  static generateAuthResponse(user) {
    console.log('generateAuthResponse: user', user);
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: {
        _id: user.role._id,
        name: user.role.name
      },
      profilePicture: user.profilePicture
    };
  }

  static async sendPasswordResetEmail(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset';
    const html = `<p>You are receiving this email because you (or someone else) have requested the reset of the password for your account.</p>
                   <p>Please click on the following link, or paste this into your browser to complete the process:</p>
                   <p><a href="${resetLink}">${resetLink}</a></p>
                   <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`;

    await sendEmail(user.email, subject, html);
  }

  static async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new Error('Password reset token is invalid or has expired');
    }

    user.password = await this.hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    const subject = 'Your password has been changed';
    const html = `<p>This is a confirmation that the password for your account ${user.email} has just been changed.</p>`;

    await sendEmail(user.email, subject, html);
  }
}

export default AuthService;
