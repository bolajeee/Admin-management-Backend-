import ValidationUtils from './validationUtils.js';

export class AuthValidation {
  static validateForgotPassword(data) {
    const { email } = data;
    const errors = [];

    if (!email) errors.push('Email is required');
    if (email && !this.isValidEmail(email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateResetPassword(data) {
    const { token, newPassword, confirmPassword } = data;
    const errors = [];

    if (!token) errors.push('Token is required');
    if (!newPassword) errors.push('New password is required');
    if (newPassword && newPassword.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    if (newPassword !== confirmPassword) {
      errors.push('Passwords do not match');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateSignup(data) {
    const { name, email, password } = data;
    const errors = [];

    if (!name) errors.push('Name is required');
    if (!email) errors.push('Email is required');
    if (!password) errors.push('Password is required');

    if (password && password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (email && !this.isValidEmail(email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateLogin(data) {
    const { email, password } = data;
    const errors = [];

    if (!email) errors.push('Email is required');
    if (!password) errors.push('Password is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateCreateUser(data) {
    const { name, email, role } = data;
    const errors = [];

    if (!name) errors.push('Name is required');
    if (!email) errors.push('Email is required');
    if (!role) errors.push('Role is required');

    if (email && !this.isValidEmail(email)) {
      errors.push('Invalid email format');
    }

    if (role && !['admin', 'employee'].includes(role)) {
      errors.push('Invalid role. Must be either admin or employee');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static isStrongPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    return strongPasswordRegex.test(password);
  }
}
