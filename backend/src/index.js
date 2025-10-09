import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './lib/db.js';
import User from './models/user.model.js';

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
    origin: '*',
    credentials: true
  }
});

// Export io for use in other files
export { io };

// Middleware
app.use(express.json());
app.use(cookieParser());

// Configure CORS with explicit allowed origins
const allowedOrigins = [
  'http://localhost:3000',  // Default React port
  'http://localhost:5173',  // Default Vite port
  'http://127.0.0.1:3000', // Alternative localhost
  'http://127.0.0.1:5173', // Alternative Vite localhost
  'https://admin-management-frontend.vercel.app',
];

// Add FRONTEND_URL from environment if it exists
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

// Serve static files from uploads directory for previews
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
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


// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/reports');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory at', uploadsDir);
}

// Connect to database and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});