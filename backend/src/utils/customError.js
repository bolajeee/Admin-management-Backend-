export class CustomError extends Error {
  constructor(message, statusCode = 500, originalError = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.originalError = originalError;
    
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
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}
