// Utils to standardize API responses and error handling

export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const errorResponse = (res, error, message = 'Internal server error', statusCode = 500) => {
  console.error(`Error: ${message}`, error);
  
  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

export const validationError = (res, errors) => {
  res.status(400).json({
    success: false,
    message: 'Validation error',
    errors: Array.isArray(errors) ? errors : [errors]
  });
};
