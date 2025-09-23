import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import { generateToken } from '../lib/utils/utils.js';

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
}

export default AuthService;
