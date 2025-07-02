import express from 'express';
import dotenv from 'dotenv';
import cors from "cors"
import cookieParser from "cookie-parser"
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import authRoute from './routes/auth.route.js';
import messageRoute from './routes/message.route.js';
import taskRoute from './routes/task.route.js';
import memoRoute from './routes/memo.route.js';
import { connectDB } from './lib/db.js';
import User from './models/user.model.js';
import Message from './models/message.model.js';
import Memo from './models/memo.model.js';
import Task from './models/task.model.js';
import dashboardRoutes from "./routes/dashboard.route.js";


const app = express();
dotenv.config();

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

const port = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.io server
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true
    }
});

// Socket.io connection handling
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return next(new Error('Authentication error: User not found'));
        }
        
        // Store user info in the socket for later use
        socket.user = {
            id: user._id.toString(),
            role: user.role
        };
        
        // Update user's socket ID
        await User.findByIdAndUpdate(user._id, { 
            $set: { 
                socketId: socket.id,
                lastSeen: null,
                isOnline: true 
            } 
        });
        
        // Notify others that this user is now online
        socket.broadcast.emit('user_online', { 
            userId: user._id,
            lastSeen: null,
            isOnline: true 
        });
        
        next();
    } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id} (${socket.id})`);
    
    // Join user's personal room for private messages
    socket.join(`user_${socket.user.id}`);
    
    // Join all active conversations for this user
    socket.on('join_conversations', async (conversationIds = []) => {
        conversationIds.forEach(conversationId => {
            socket.join(`conversation_${conversationId}`);
        });
    });

    // Handle real-time messaging
    socket.on('send_message', async (messageData) => {
        try {
            const { receiverId, text, conversationId } = messageData;
            
            // Create message in database
            const message = await Message.create({
                sender: socket.user.id,
                receiver: receiverId,
                text,
                status: 'sent'
            });
            
            // Populate sender info
            const populatedMessage = await Message.findById(message._id)
                .populate('sender', 'name email profilePicture')
                .populate('receiver', 'name email profilePicture');
            
            // Emit to the specific conversation
            io.to(`conversation_${conversationId}`).emit('receive_message', {
                ...populatedMessage.toJSON(),
                conversationId
            });
            
            // Emit to receiver's personal room for notifications
            io.to(`user_${receiverId}`).emit('new_message_notification', {
                message: populatedMessage,
                conversationId
            });
            
            // Update message status to delivered
            await Message.findByIdAndUpdate(message._id, { 
                status: 'delivered',
                deliveredAt: new Date() 
            });
            
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('message_error', { 
                error: 'Failed to send message',
                details: error.message 
            });
        }
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
                // TODO: Send email/SMS notifications if configured
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
httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    connectDB();
});
