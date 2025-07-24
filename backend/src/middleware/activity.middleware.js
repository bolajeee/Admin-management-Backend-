/**
 * Simple activity tracking middleware for auth routes
 */

/**
 * Middleware to track login activity
 */
export const trackLogin = (req, res, next) => {
  // We'll modify the response to track after login succeeds
  const originalSend = res.send;
  
  res.send = function(body) {
    const response = body instanceof Buffer ? body.toString() : body;
    
    try {
      // If it's a successful login
      if (res.statusCode === 200 && typeof response === 'string') {
        const parsedResponse = JSON.parse(response);
        
        if (parsedResponse.user && parsedResponse.user._id) {
          console.log(`User logged in: ${parsedResponse.user._id}`);
          // You could log this to a database in a production app
        }
      }
    } catch (error) {
      console.error('Error parsing response in login tracker:', error);
    }
    
    // Call the original send function
    originalSend.call(this, body);
    return this;
  };
  
  next();
};

/**
 * Middleware to track failed login attempts
 */
export const trackLoginFailure = (req, res, next) => {
  // Get email from request body
  const { email } = req.body;
  
  if (!email) return next();
  
  // We need to track after login failure, so we modify the response
  const originalStatus = res.status;
  
  res.status = function(statusCode) {
    // If it's an unauthorized response (login failure)
    if (statusCode === 401) {
      console.log(`Failed login attempt for email: ${email}`);
      // You could log this to a database in a production app
    }
    
    // Call the original status function
    return originalStatus.call(this, statusCode);
  };
  
  next();
};

/**
 * Middleware to track general activity
 */
export const trackActivity = (action) => {
  return (req, res, next) => {
    console.log(`Activity: ${action} by user ${req.user?.userId || 'anonymous'}`);
    // You could log this to a database in a production app
    next();
  };
};