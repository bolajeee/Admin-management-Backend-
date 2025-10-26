// Utils to standardize API responses and error handling

/**
 * Standard success response format
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @param {Object} pagination - Pagination metadata
 * @param {Object} meta - Additional metadata
 */
export const successResponse = (res, data, message = 'Success', statusCode = 200, pagination = null, meta = null) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };

  if (pagination) {
    response.pagination = {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNext: pagination.hasNext,
      hasPrev: pagination.hasPrev
    };
  }

  if (meta) {
    response.meta = meta;
  }

  res.status(statusCode).json(response);
};

/**
 * Standard error response format
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 */
export const errorResponse = (res, error, message = 'Internal server error', statusCode = 500) => {
  console.error(`Error: ${message}`, {
    error: error?.message,
    stack: error?.stack,
    timestamp: new Date().toISOString()
  });

  const response = {
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && error && {
        details: error.message,
        stack: error.stack
      })
    },
    timestamp: new Date().toISOString()
  };

  res.status(statusCode).json(response);
};

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {Array|Object} errors - Validation errors
 */
export const validationError = (res, errors) => {
  const formattedErrors = Array.isArray(errors) ? errors : [errors];

  res.status(400).json({
    success: false,
    error: {
      message: 'Validation failed',
      details: formattedErrors
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Created response for resource creation
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 */
export const createdResponse = (res, data, message = 'Resource created successfully') => {
  successResponse(res, data, message, 201);
};

/**
 * No content response for successful operations with no return data
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 */
export const noContentResponse = (res, message = 'Operation completed successfully') => {
  res.status(204).json({
    success: true,
    message,
    timestamp: new Date().toISOString()
  });
};
