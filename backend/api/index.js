import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from '../src/lib/db.js';

// Import middleware
import { globalErrorHandler, notFoundHandler } from '../src/middleware/errorHandler.middleware.js';
import { requestLogger, securityHeaders } from '../src/middleware/requestLogger.middleware.js';

// Import Swagger documentation
import { specs, swaggerUi } from '../src/config/swagger.js';

// Import routes
import authRoute from '../src/routes/auth.route.js';
import messageRoute from '../src/routes/message.route.js';
import memoRoute from '../src/routes/memo.route.js';
import taskRoute from '../src/routes/task.route.js';
import dashboardRoute from '../src/routes/dashboard.route.js';
import adminRoute from '../src/routes/admin.route.js';
import reportRoute from '../src/routes/report.route.js';
import settingsRoute from '../src/routes/settings.route.js';
import roleRoute from '../src/routes/role.route.js';
import teamRoute from '../src/routes/team.route.js';
import auditRoute from '../src/routes/audit.route.js';

dotenv.config();

const app = express();

const allowedOrigins = [
    "http://localhost:5173",
    "https://admin-management-frontend.vercel.app"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log("❌ Blocked by CORS:", origin);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));

app.options(/.*/, cors({ origin: true, credentials: true }));

// Security headers
app.use(securityHeaders);

// Request logging
app.use(requestLogger);

// JSON & cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Admin Management API Documentation'
}));

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Admin Management System API',
        version: '1.0.0',
        documentation: '/api-docs',
        health: '/health',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// Handle favicon and other browser requests
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());
app.get('/robots.txt', (req, res) => res.status(204).end());
app.get('/sitemap.xml', (req, res) => res.status(204).end());

// API Routes
app.use("/api/auth", authRoute);
app.use("/api/settings", settingsRoute);
app.use("/api/messages", messageRoute);
app.use("/api/memos", memoRoute);
app.use("/api/tasks", taskRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/admin", adminRoute);
app.use("/api/reports", reportRoute);
app.use("/api/roles", roleRoute);
app.use("/api/teams", teamRoute);
app.use("/api/audit", auditRoute);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Connect to database
let isConnected = false;

const connectToDatabase = async () => {
    if (isConnected) {
        return;
    }

    try {
        await connectDB();
        isConnected = true;
    } catch (error) {
        console.error('Failed to connect to database:', error);
        throw error;
    }
};

// Serverless function handler
export default async function handler(req, res) {
    try {
        await connectToDatabase();
        return app(req, res);
    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
        });
    }
}