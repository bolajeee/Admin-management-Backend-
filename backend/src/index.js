import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './lib/db.js';
import User from './models/user.model.js';

// Import middleware
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.middleware.js';
import { requestLogger, securityHeaders } from './middleware/requestLogger.middleware.js';
import logger from './utils/logger.js';

// Import Swagger documentation
import { specs, swaggerUi } from './config/swagger.js';

// Import routes
import authRoute from './routes/auth.route.js';
import messageRoute from './routes/message.route.js';
import memoRoute from './routes/memo.route.js';
import taskRoute from './routes/task.route.js';
import dashboardRoute from './routes/dashboard.route.js';
import adminRoute from './routes/admin.route.js';
import reportRoute from './routes/report.route.js';
import settingsRoute from './routes/settings.route.js';
import roleRoute from './routes/role.route.js';
import teamRoute from './routes/team.route.js';
import auditRoute from './routes/audit.route.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    // More flexible CORS for Socket.IO
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (origin.startsWith('http://localhost:') ||
        origin === process.env.FRONTEND_URL ||
        origin === 'https://admin-management-backend.onrender.com') {
        return callback(null, true);
      }


      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }
});

// Export io for use in other files
export { io };

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

// Serve static files from uploads directory for previews
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  // Handle user joining
  socket.on('join', async (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);

    // Update user's socket ID in database
    try {
      await User.findByIdAndUpdate(userId, {
        socketId: socket.id,
        isActive: true,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Error updating socket ID:', error);
    }
  });

  // Handle sending messages
  socket.on('sendMessage', async (message) => {
    try {
      // Emit to recipient
      io.to(message.recipient).emit('receiveMessage', message);
    } catch (error) {
      console.error('Error sending message via socket:', error);
    }
  });

  // Handle user disconnection
  socket.on('disconnect', async () => {
    console.log('user disconnected');

    // Update user status in database
    try {
      await User.findOneAndUpdate(
        { socketId: socket.id },
        {
          isActive: false,
          lastSeen: new Date(),
          socketId: ''
        }
      );
    } catch (error) {
      console.error('Error updating user status on disconnect:', error);
    }
  });
});


// Create uploads directory if it doesn't exist (skip in serverless environments)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
if (!isServerless) {
  const uploadsDir = path.join(__dirname, '../uploads/reports');
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads directory at', uploadsDir);
    } catch (error) {
      console.warn('Could not create uploads directory:', error.message);
    }
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
  });
});

// Connect to database and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
    logger.info(`Health check available at http://localhost:${PORT}/health`);
  });
}).catch((error) => {
  logger.error('Failed to connect to database:', error);
  process.exit(1);
});