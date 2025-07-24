import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB } from './lib/db.js';
import User from './models/user.model.js';
<<<<<<< HEAD
=======
import Message from './models/message.model.js';
import Memo from './models/memo.model.js';
import Task from './models/task.model.js';
import dashboardRoutes from "./routes/dashboard.route.js";
import adminRoutes from "./routes/admin.route.js"
>>>>>>> parent of 0b6b426 (Report and activity tracking routes)

// Import routes - using your original variable names
import authRoute from './routes/auth.route.js';
import messageRoute from './routes/message.route.js';
import memoRoute from './routes/memo.route.js';
import taskRoute from './routes/task.route.js';
import dashboardRoute from './routes/dashboard.route.js';
import adminRoute from './routes/admin.route.js';
import reportRoute from './routes/report.route.js';

dotenv.config();

<<<<<<< HEAD
const app = express();
const PORT = process.env.PORT || 5000;
=======
app.use(express.json());
app.use(cookieParser())
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))

app.use("/api/auth", authRoute)
app.use("/api/messages", messageRoute)
app.use("/api/tasks", taskRoute)
app.use("/api/memos", memoRoute)
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes)

const port = process.env.PORT || 5000;
>>>>>>> parent of 0b6b426 (Report and activity tracking routes)

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
<<<<<<< HEAD
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
=======
    });
    
    // Handle message read receipt
    socket.on('mark_message_read', async ({ messageId, conversationId }) => {
        try {
            const message = await Message.markAsRead(messageId, socket.user.id);
            if (message) {
                io.to(`conversation_${conversationId}`).emit('message_read', {
                    messageId: message._id,
                    readBy: socket.user.id,
                    readAt: message.readAt
                });
            }
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    });
    
    // Handle typing indicator
    socket.on('typing', ({ conversationId, isTyping }) => {
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
            userId: socket.user.id,
            conversationId,
            isTyping
        });
    });
    
    // Handle new memo creation
    socket.on('create_memo', async (memoData) => {
        try {
            const memo = await Memo.create({
                ...memoData,
                createdBy: socket.user.id,
                status: 'active'
            });
            
            // Populate the created memo with user data
            const populatedMemo = await Memo.findById(memo._id)
                .populate('createdBy', 'name email profilePicture')
                .populate('recipients', 'name email socketId');
            
            // Notify each recipient
            populatedMemo.recipients.forEach(recipient => {
                if (recipient.socketId) {
                    io.to(recipient.socketId).emit('new_memo', populatedMemo);
                }
            });
            
        } catch (error) {
            console.error('Error creating memo:', error);
            socket.emit('memo_error', { 
                error: 'Failed to create memo',
                details: error.message 
            });
        }
    });
    
    // Handle memo acknowledgment
    socket.on('acknowledge_memo', async ({ memoId, comment = '' }) => {
        try {
            const memo = await Memo.findById(memoId);
            if (memo) {
                await memo.acknowledge(socket.user.id, comment);
                io.emit('memo_acknowledged', { 
                    memoId,
                    acknowledgedBy: socket.user.id,
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.error('Error acknowledging memo:', error);
        }
    });
    
    // Handle task updates
    socket.on('update_task', async (taskData) => {
        try {
            const { taskId, ...updates } = taskData;
            const task = await Task.findById(taskId);
            
            if (!task) {
                throw new Error('Task not found');
            }
            
            // Check permissions
            if (task.createdBy.toString() !== socket.user.id && 
                !task.assignees.some(id => id.toString() === socket.user.id)) {
                throw new Error('Not authorized to update this task');
            }
            
            // Update task
            Object.assign(task, updates);
            await task.save();
            
            // Notify all task followers
            const followers = [...new Set([
                ...task.followers.map(id => id.toString()),
                task.createdBy.toString(),
                ...task.assignees.map(id => id.toString())
            ])];
            
            followers.forEach(userId => {
                io.to(`user_${userId}`).emit('task_updated', task);
            });
            
        } catch (error) {
            console.error('Error updating task:', error);
            socket.emit('task_error', { 
                error: 'Failed to update task',
                details: error.message 
            });
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
        console.log(`User disconnected: ${socket.user.id} (${socket.id})`);
        
        try {
            // Update user's online status
            const user = await User.findByIdAndUpdate(socket.user.id, { 
                $set: { 
                    isOnline: false,
                    lastSeen: new Date()
                } 
            }, { new: true });
            
            // Notify others that this user is now offline
            if (user) {
                socket.broadcast.emit('user_offline', { 
                    userId: user._id,
                    lastSeen: user.lastSeen,
                    isOnline: false 
                });
            }
        } catch (error) {
            console.error('Error updating user status on disconnect:', error);
        }
    });
});

export {io}

// Start the server




app.use(errorHandler);
connectDB().then(() => {
  // Initialize the report scheduler after DB connection
  reportScheduler.initialize();

  // Start the server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
app.use(errorHandler);
connectDB().then(() => {
  // Initialize the report scheduler after DB connection
  reportScheduler.initialize();

  // Start the server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
