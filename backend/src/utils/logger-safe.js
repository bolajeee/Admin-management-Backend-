// Safe logger for serverless environments - no file system operations
class Logger {
    formatMessage(level, message, meta = {}) {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            message,
            ...meta
        });
    }

    info(message, meta = {}) {
        console.log(`ℹ️  ${message}`, meta);
    }

    warn(message, meta = {}) {
        console.warn(`⚠️  ${message}`, meta);
    }

    error(message, error = null, meta = {}) {
        const errorMeta = {
            ...meta,
            ...(error && {
                error: error.message,
                stack: error.stack
            })
        };

        console.error(`❌ ${message}`, errorMeta);
    }

    debug(message, meta = {}) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`🐛 ${message}`, meta);
        }
    }

    http(req, res, responseTime) {
        const message = `${req.method} ${req.url} - ${res.statusCode}`;
        const meta = {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        };

        if (res.statusCode >= 400) {
            this.error(message, null, meta);
        } else {
            this.info(message, meta);
        }
    }
}

export default new Logger();