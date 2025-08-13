import mongoose from 'mongoose';

class ValidationUtils {
  static isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  static validateRequiredFields(data, fields) {
    const missing = fields.filter(field => !data[field]);
    if (missing.length > 0) {
      return {
        isValid: false,
        errors: missing.map(field => `${field} is required`)
      };
    }
    return { isValid: true };
  }

  static validateEnumFields(data, enumFields) {
    const errors = [];
    Object.entries(enumFields).forEach(([field, validValues]) => {
      if (data[field] && !validValues.includes(data[field])) {
        errors.push(`Invalid ${field}. Must be one of: ${validValues.join(', ')}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateDateFields(data, dateFields) {
    const errors = [];
    dateFields.forEach(field => {
      if (data[field] && isNaN(new Date(data[field]).getTime())) {
        errors.push(`Invalid date format for ${field}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Common validation patterns
  static taskValidation(data) {
    const requiredFields = ['title'];
    const enumFields = {
      status: ['todo', 'in-progress', 'completed', 'blocked', 'cancelled'],
      priority: ['low', 'medium', 'high', 'urgent']
    };
    const dateFields = ['dueDate'];

    const validations = [
      this.validateRequiredFields(data, requiredFields),
      this.validateEnumFields(data, enumFields),
      this.validateDateFields(data, dateFields)
    ];

    const errors = validations.reduce((acc, validation) => 
      !validation.isValid ? [...acc, ...validation.errors] : acc, []);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static memoValidation(data) {
    const requiredFields = ['title', 'content'];
    const enumFields = {
      severity: ['low', 'medium', 'high', 'critical'],
      status: ['draft', 'active', 'archived']
    };
    const dateFields = ['expiresAt'];

    const validations = [
      this.validateRequiredFields(data, requiredFields),
      this.validateEnumFields(data, enumFields),
      this.validateDateFields(data, dateFields)
    ];

    const errors = validations.reduce((acc, validation) => 
      !validation.isValid ? [...acc, ...validation.errors] : acc, []);

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ValidationUtils;
