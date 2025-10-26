export class CustomError extends Error {
  constructor(message, statusCode = 500, originalError = null, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.isOperational = isOperational;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);

    // If there's an original error, append its stack to this error's stack
    if (originalError && originalError.stack) {
      this.stack += '\nCaused by: ' + originalError.stack;
    }
  }

  toJSON() {
    return {
      error: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

// Specific error classes
export class ValidationError extends CustomError {
  constructor(message, field = null) {
    super(message, 400);
    this.field = field;
  }
}

export class AuthenticationError extends CustomError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends CustomError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends CustomError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends CustomError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

export class RateLimitError extends CustomError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

export class DatabaseError extends CustomError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, originalError);
  }
}

export class ExternalServiceError extends CustomError {
  constructor(message = 'External service error', originalError = null) {
    super(message, 502, originalError);
  }
}
