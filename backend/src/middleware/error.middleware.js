/**
 * Global error handling middleware
 * Provides consistent error responses across the API
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Set default error values
  const status = err.status || 500;
  const message = err.message || 'Something went wrong';
  
  // Handle MongoDB specific errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: Object.values(err.errors).map(val => val.message).join(', ')
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate Key Error',
      message: 'A record with that information already exists'
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'Your session is invalid or has expired'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Expired Token',
      message: 'Your session has expired. Please log in again'
    });
  }
  
  // Send standard error response
  res.status(status).json({
    success: false,
    error: err.name || 'Error',
    message
  });
};