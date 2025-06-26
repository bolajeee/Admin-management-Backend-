import express from 'express';
import dotenv from 'dotenv';
import cors from "cors"
import cookieParser from "cookie-parser"
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoute from './routes/auth.route.js';
import messageRoute from './routes/message.route.js';
import taskRoute from './routes/task.route.js';
import memoRoute from './routes/memo.route.js';
import { connectDB } from './lib/db.js';
import { updateProfile } from './controllers/auth.controller.js';


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
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user joining a chat room
    socket.on('join_chat', (chatId) => {
        socket.join(chatId);
        console.log(`User ${socket.id} joined chat: ${chatId}`);
    });

    // Handle real-time messaging
    socket.on('send_message', (data) => {
        socket.to(data.chatId).emit('receive_message', data);
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
        socket.to(data.chatId).emit('user_typing', {
            userId: data.userId,
            chatId: data.chatId,
            isTyping: data.isTyping
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

export {io}

// Start the server
httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    connectDB();
});
