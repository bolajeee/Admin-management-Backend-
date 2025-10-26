import logger from '../utils/logger.js';

/**
 * Request logging middleware
 * Logs all incoming requests with response time and status
 */
export const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Skip logging for common browser requests that aren't API calls
    const skipLogging = ['/favicon.ico', '/robots.txt', '/sitemap.xml'].includes(req.url);

    if (!skipLogging) {
        // Log request start
        logger.info(`Incoming ${req.method} request to ${req.url}`, {
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            body: req.method !== 'GET' ? req.body : undefined
        });
    }

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function (...args) {
        const responseTime = Date.now() - startTime;
        if (!skipLogging) {
            logger.http(req, res, responseTime);
        }
        originalEnd.apply(this, args);
    };

    next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
};