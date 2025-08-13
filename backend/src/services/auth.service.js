import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import { generateToken } from '../lib/utils/utils.js';

class AuthService {
  static async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  static async comparePasswords(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async createUserWithRole(userData) {
    const { name, email, role, password } = userData;
    
    // Set default password based on role if not provided
    const defaultPassword = password || (role === 'admin' ? 'admin' : 'employee');
    const hashedPassword = await this.hashPassword(defaultPassword);

    const user = new User({
      name,
      email,
      role,
      password: hashedPassword
    });

    return await user.save();
  }

  static getDefaultPassword(role) {
    return role === 'admin' ? 'admin' : 'employee';
  }

  static async resetUserPassword(userId) {
    const user = await User.findById(userId);
    if (!user) return null;

    const defaultPassword = this.getDefaultPassword(user.role);
    user.password = await this.hashPassword(defaultPassword);
    return await user.save();
  }

  static generateAuthResponse(user) {
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture
    };
  }
}

export default AuthService;
