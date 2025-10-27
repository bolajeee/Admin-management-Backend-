import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Detect serverless environment
const isServerless = !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    process.env.VERCEL_ENV ||
    process.env.NETLIFY ||
    process.platform === 'linux' && process.env.NODE_ENV === 'production' && !process.env.PM2_HOME
);

let logsDir = '/tmp';
let canWriteFiles = false;

// Only set up file logging in non-serverless environments
if (!isServerless) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        logsDir = path.join(__dirname, '../../logs');

        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        canWriteFiles = true;
    } catch (error) {
        console.warn('Could not create logs directory, file logging disabled:', error.message);
        canWriteFiles = false;
        logsDir = '/tmp'; // fallback
    }
}

class Logger {
    constructor() {
        this.logFile = path.join(logsDir, 'app.log');
        this.errorFile = path.join(logsDir, 'error.log');
    }

    formatMessage(level, message, meta = {}) {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            level,
            message,
            ...meta
        }) + '\n';
    }

    writeToFile(filename, content) {
        // Skip file writing in serverless environments or if we can't write files
        if (isServerless || !canWriteFiles) {
            return;
        }

        try {
            fs.appendFileSync(filename, content);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    info(message, meta = {}) {
        const logMessage = this.formatMessage('INFO', message, meta);
        console.log(`ℹ️  ${message}`, meta);
        this.writeToFile(this.logFile, logMessage);
    }

    warn(message, meta = {}) {
        const logMessage = this.formatMessage('WARN', message, meta);
        console.warn(`⚠️  ${message}`, meta);
        this.writeToFile(this.logFile, logMessage);
    }

    error(message, error = null, meta = {}) {
        const errorMeta = {
            ...meta,
            ...(error && {
                error: error.message,
                stack: error.stack
            })
        };

        const logMessage = this.formatMessage('ERROR', message, errorMeta);
        console.error(`❌ ${message}`, errorMeta);
        this.writeToFile(this.errorFile, logMessage);
        this.writeToFile(this.logFile, logMessage);
    }

    debug(message, meta = {}) {
        if (process.env.NODE_ENV === 'development') {
            const logMessage = this.formatMessage('DEBUG', message, meta);
            console.debug(`🐛 ${message}`, meta);
            this.writeToFile(this.logFile, logMessage);
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