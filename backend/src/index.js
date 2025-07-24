import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './lib/db.js';
import User from './models/user.model.js';









// Import routes - using your original variable names
import authRoute from './routes/auth.route.js';
import messageRoute from './routes/message.route.js';
import memoRoute from './routes/memo.route.js';
import taskRoute from './routes/task.route.js';
import dashboardRoute from './routes/dashboard.route.js';
import adminRoute from './routes/admin.route.js';
import reportRoute from './routes/report.route.js';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;


















// Create HTTP server
const server = createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
  }
});

// Export io for use in other files
export { io };

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Routes - using your original variable names
app.use("/api/auth", authRoute);
app.use("/api/messages", messageRoute);
app.use("/api/memos", memoRoute);
app.use("/api/tasks", taskRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/admin", adminRoute);
app.use("/api/reports", reportRoute);

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

// Connect to database and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});










































































































































































