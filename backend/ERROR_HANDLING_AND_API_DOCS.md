# Enhanced Error Handling and API Documentation

This document outlines the comprehensive error handling system and API documentation implemented for the Admin Management System.

## 🚨 Error Handling System

### Error Types

The system implements a hierarchical error handling structure with the following custom error classes:

#### Base Error Class
- `CustomError`: Base class for all custom errors with status codes and operational flags

#### Specific Error Classes
- `ValidationError`: For input validation failures (400)
- `AuthenticationError`: For authentication failures (401)
- `AuthorizationError`: For authorization failures (403)
- `NotFoundError`: For resource not found (404)
- `ConflictError`: For resource conflicts (409)
- `RateLimitError`: For rate limiting (429)
- `DatabaseError`: For database operation failures (500)
- `ExternalServiceError`: For external service failures (502)

### Error Handling Middleware

#### Global Error Handler
- Catches all errors and formats them consistently
- Handles different error types (Mongoose, JWT, Multer, etc.)
- Provides detailed error information in development
- Logs errors for monitoring

#### Async Handler
- Wraps async route handlers to catch promise rejections
- Automatically passes errors to the global error handler

#### Validation Handler
- Processes express-validator results
- Formats validation errors consistently

### Error Response Format

All error responses follow this consistent format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "details": "Additional error details (development only)"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint",
  "method": "POST"
}
```

### Success Response Format

All success responses follow this consistent format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 📚 API Documentation

### Swagger/OpenAPI Integration

The API documentation is automatically generated using Swagger/OpenAPI 3.0 specification.

#### Access Points
- **Development**: `http://localhost:5000/api-docs`
- **Production**: `https://your-domain.com/api-docs`

#### Features
- Interactive API explorer
- Request/response examples
- Authentication testing
- Schema validation
- Error response documentation

### Documentation Structure

#### Components
- **Schemas**: Reusable data models (User, Task, Memo, etc.)
- **Security Schemes**: JWT Bearer token and cookie authentication
- **Responses**: Standard error responses (400, 401, 403, 404, 500)

#### Route Documentation
Each route includes:
- Summary and description
- Request parameters and body schemas
- Response schemas and examples
- Authentication requirements
- Error responses

### Health Check Endpoint

A health check endpoint is available at `/health`:

```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

## 📊 Logging System

### Logger Features
- Structured JSON logging
- Multiple log levels (INFO, WARN, ERROR, DEBUG)
- File-based logging with rotation
- HTTP request logging
- Error stack traces in development

### Log Files
- `logs/app.log`: General application logs
- `logs/error.log`: Error-specific logs

### Log Format
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "INFO",
  "message": "Log message",
  "meta": {
    "additional": "data"
  }
}
```

## 🔒 Security Enhancements

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security` (production only)

### Request Logging
- All requests are logged with timing information
- IP addresses and user agents are tracked
- Request bodies are logged (excluding sensitive data)

## 🛠️ Implementation Examples

### Using Custom Errors in Controllers

```javascript
import { NotFoundError, ValidationError } from '../utils/customError.js';

export const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      throw new ValidationError('User ID is required');
    }
    
    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    successResponse(res, user, 'User retrieved successfully');
  } catch (error) {
    next(error); // Pass to global error handler
  }
};
```

### Adding Route Documentation

```javascript
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validateObjectId('id'), asyncHandler(getUser));
```

### Using Validation Middleware

```javascript
import { validateCreateTask } from '../middleware/validation.middleware.js';

router.post('/', 
  protectRoute, 
  validateCreateTask, 
  asyncHandler(createTask)
);
```

## 🚀 Benefits

### For Developers
- Consistent error handling across the application
- Automatic error logging and monitoring
- Type-safe error handling with custom error classes
- Comprehensive API documentation
- Better debugging with structured logging

### For API Consumers
- Consistent error response format
- Clear error messages and status codes
- Interactive API documentation
- Request/response examples
- Authentication guidance

### For Operations
- Centralized error logging
- Health check monitoring
- Request tracking and performance metrics
- Security headers for protection
- Graceful error handling and recovery

## 📝 Best Practices

1. **Always use custom error classes** instead of generic Error objects
2. **Wrap async functions** with asyncHandler middleware
3. **Validate input** using validation middleware
4. **Log important operations** with appropriate log levels
5. **Document all endpoints** with Swagger annotations
6. **Use consistent response formats** with response handler utilities
7. **Handle edge cases** and provide meaningful error messages
8. **Test error scenarios** to ensure proper error handling

## 🔧 Configuration

### Environment Variables
```env
NODE_ENV=development|production
LOG_LEVEL=debug|info|warn|error
```

### Swagger Configuration
The Swagger configuration is located in `src/config/swagger.js` and can be customized for different environments and requirements.

This enhanced error handling and documentation system provides a robust foundation for maintaining and scaling the Admin Management System.