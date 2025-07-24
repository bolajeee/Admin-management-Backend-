import ActivityService from '../services/activity.service.js';

/**
 * Middleware to track user activity
 * @param {String} action - The action being performed
 * @returns {Function} Express middleware function
 */
export const trackActivity = (action) => {
    return (req, res, next) => {
        // Only track activity for authenticated users
        if (!req.user || !req.user.userId) return next();

        // Extract information from request
        const { userId } = req.user;
        const { ip } = req;
        const userAgent = req.headers['user-agent'];

        // Extract resource information if available
        let resourceType, resourceId;

        // Determine resource type and ID based on URL pattern
        // Example: /api/tasks/123 => resourceType: 'task', resourceId: '123'
        const urlParts = req.originalUrl.split('/');
        if (urlParts.length >= 3) {
            // The resource type is usually the plural entity name
            resourceType = urlParts[2];
            // If there's an ID in the URL (e.g., /api/tasks/123)
            if (urlParts.length >= 4 && urlParts[3] && !urlParts[3].includes('?')) {
                resourceId = urlParts[3];
            }
        }

        // Sanitize resource type (remove api prefix, query params, etc.)
        if (resourceType) {
            resourceType = resourceType.split('?')[0];  // Remove query parameters

            // Convert plural to singular (basic implementation)
            if (resourceType.endsWith('s')) {
                resourceType = resourceType.slice(0, -1);
            }
        }

        // Get details based on the HTTP method
        let details = {};

        if (req.method === 'GET') {
            details.query = req.query;
        } else if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            // Don't log sensitive data like passwords
            const sanitizedBody = { ...req.body };
            if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
            if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';

            details.body = sanitizedBody;
        } else if (req.method === 'DELETE') {
            details.id = resourceId;
        }

        // Log the activity asynchronously (don't wait for it to complete)
        ActivityService.logActivity({
            user: userId,
            action,
            details,
            ipAddress: ip,
            userAgent,
            resourceType,
            resourceId
        }).catch(error => {
            console.error('Error logging activity:', error);
        });

        // Continue with the request
        next();
    };
};

/**
 * Middleware to track login activity
 */
export const trackLogin = (req, res, next) => {
    // We need to track after login success, so we modify the response
    const originalSend = res.send;

    res.send = function (body) {
        const response = body instanceof Buffer ? body.toString() : body;

        try {
            // If it's a successful login
            if (res.statusCode === 200 && typeof response === 'string') {
                const parsedResponse = JSON.parse(response);

                if (parsedResponse.user && parsedResponse.user._id) {
                    ActivityService.logActivity({
                        user: parsedResponse.user._id,
                        action: 'login',
                        details: {
                            success: true
                        },
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent']
                    }).catch(error => {
                        console.error('Error logging login activity:', error);
                    });
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

    res.status = function (statusCode) {
        // If it's an unauthorized response (login failure)
        if (statusCode === 401) {
            // We don't have a user ID for failed logins, so we'll just log the email
            ActivityService.logActivity({
                // We'll use a special "system" user ID for anonymous activities
                user: '000000000000000000000000', // 24 zeros = placeholder ObjectId
                action: 'login_failed',
                details: {
                    email, // This helps identify which account was targeted
                    success: false
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }).catch(error => {
                console.error('Error logging failed login activity:', error);
            });
        }

        // Call the original status function
        return originalStatus.call(this, statusCode);
    };

    next();
};
