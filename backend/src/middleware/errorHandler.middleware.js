import { CustomError } from '../utils/customError.js';

/**
 * Global error handling middleware
 * This should be the last middleware in the chain
 */
export const globalErrorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error for debugging
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Resource not found';
        error = new CustomError(message, 404);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `${field} already exists`;
        error = new CustomError(message, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = new CustomError(message, 400);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = new CustomError(message, 401);
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = new CustomError(message, 401);
    }

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        const message = 'File too large';
        error = new CustomError(message, 400);
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        const message = 'Unexpected file field';
        error = new CustomError(message, 400);
    }

    // Rate limiting errors
    if (err.status === 429) {
        const message = 'Too many requests, please try again later';
        error = new CustomError(message, 429);
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: {
            message: error.message || 'Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
            ...(process.env.NODE_ENV === 'development' && { details: error.originalError })
        },
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
    });
};

/**
 * Async error wrapper to catch async errors and pass to error handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req, res, next) => {
    // Common browser requests that we don't need to log as errors
    const commonRequests = ['/favicon.ico', '/robots.txt', '/sitemap.xml', '/apple-touch-icon.png'];

    if (commonRequests.includes(req.originalUrl)) {
        return res.status(404).end();
    }

    const error = new CustomError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};

/**
 * Validation error handler for express-validator
 */
export const handleValidationErrors = (req, res, next) => {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        return res.status(400).json({
            success: false,
            error: {
                message: 'Validation failed',
                details: errorMessages
            },
            timestamp: new Date().toISOString(),
            path: req.path,
            method: req.method
        });
    }

    next();
};