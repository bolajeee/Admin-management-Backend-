import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from '../utils/customError.js';

/**
 * Handle validation results
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        throw new ValidationError('Validation failed', errorMessages);
    }

    next();
};

/**
 * Auth validation rules
 */
export const validateSignup = [
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Full name must be between 2 and 50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('role')
        .optional()
        .isIn(['admin', 'employee'])
        .withMessage('Role must be either admin or employee'),
    handleValidationErrors
];

export const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
];

export const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    handleValidationErrors
];

export const validateForgotPassword = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    handleValidationErrors
];

/**
 * Task validation rules
 */
export const validateCreateTask = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Task title must be between 3 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('assignedTo')
        .isMongoId()
        .withMessage('Invalid user ID for assignedTo'),
    body('priority')
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Priority must be one of: low, medium, high, critical'),
    body('dueDate')
        .optional()
        .isISO8601()
        .withMessage('Due date must be a valid date'),
    body('category')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Category cannot exceed 50 characters'),
    handleValidationErrors
];

export const validateUpdateTask = [
    param('taskId')
        .isMongoId()
        .withMessage('Invalid task ID'),
    body('title')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Task title must be between 3 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('status')
        .optional()
        .isIn(['pending', 'in-progress', 'completed', 'cancelled'])
        .withMessage('Status must be one of: pending, in-progress, completed, cancelled'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Priority must be one of: low, medium, high, critical'),
    body('dueDate')
        .optional()
        .isISO8601()
        .withMessage('Due date must be a valid date'),
    handleValidationErrors
];

/**
 * Memo validation rules
 */
export const validateCreateMemo = [
    body('title')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Memo title must be between 3 and 100 characters'),
    body('content')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Memo content must be between 10 and 2000 characters'),
    body('recipients')
        .optional()
        .isArray()
        .withMessage('Recipients must be an array'),
    body('recipients.*')
        .optional()
        .isMongoId()
        .withMessage('Each recipient must be a valid user ID'),
    body('severity')
        .isIn(['low', 'medium', 'high', 'critical'])
        .withMessage('Severity must be one of: low, medium, high, critical'),
    handleValidationErrors
];

/**
 * Message validation rules
 */
export const validateSendMessage = [
    param('id')
        .isMongoId()
        .withMessage('Invalid recipient ID'),
    body('text')
        .optional()
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message text must be between 1 and 1000 characters'),
    body('image')
        .optional()
        .isURL()
        .withMessage('Image must be a valid URL'),
    handleValidationErrors
];

/**
 * Pagination validation
 */
export const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
];

/**
 * MongoDB ObjectId validation
 */
export const validateObjectId = (paramName) => [
    param(paramName)
        .isMongoId()
        .withMessage(`Invalid ${paramName}`),
    handleValidationErrors
];/**
 
* Multiple ObjectId validation
 */
export const validateMultipleObjectIds = (...paramNames) => [
    ...paramNames.map(paramName =>
        param(paramName)
            .isMongoId()
            .withMessage(`Invalid ${paramName}`)
    ),
    handleValidationErrors
];

/**
 * Task comment validation
 */
export const validateTaskComment = [
    param('taskId')
        .isMongoId()
        .withMessage('Invalid task ID'),
    body('comment')
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('Comment must be between 1 and 1000 characters'),
    handleValidationErrors
];

/**
 * Task delegation validation
 */
export const validateTaskDelegation = [
    param('taskId')
        .isMongoId()
        .withMessage('Invalid task ID'),
    body('assignedTo')
        .isMongoId()
        .withMessage('Invalid user ID for assignedTo'),
    body('delegationNote')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Delegation note cannot exceed 500 characters'),
    handleValidationErrors
];