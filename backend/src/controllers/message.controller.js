import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import { MessageService } from '../services/message.service.js';
import { MessageValidation } from '../utils/messageValidation.js';
import { successResponse, errorResponse, validationError } from '../utils/responseHandler.js';
import mongoose from 'mongoose';
import { io } from '../index.js';
import NotificationService from '../services/notification.service.js';

export const getUsers = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const users = await User.find({ _id: { $ne: loggedInUserId } })
            .select("-password")
            .sort({ name: 1 });

        // Format user data consistently
        const formattedUsers = users.map(user => ({
            _id: user._id,
            name: user.name || '',
            email: user.email || '',
            role: user.role || 'employee',
            profilePicture: user.profilePicture || user.profilePic || '/avatar.png',
            lastSeen: user.lastSeen || null,
            isActive: user.isActive || false
        }));

        return res.status(200).json(formattedUsers);
    } catch (error) {
        console.error('Error in getUsers:', error);
        return res.status(500).json({ message: 'Error retrieving users' });
    }
}

export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        // Validate user IDs
        if (!mongoose.Types.ObjectId.isValid(userToChatId) || !mongoose.Types.ObjectId.isValid(myId)) {
            return errorResponse(res, null, 'Invalid user ID format', 400);
        }

        // Validate users exist
        const [user1, user2] = await Promise.all([
            User.findById(myId).select('_id'),
            User.findById(userToChatId).select('_id')
        ]);

        if (!user1 || !user2) {
            return errorResponse(res, null, 'One or both users not found', 404);
        }

        const skip = (page - 1) * limit;

        // Get messages with pagination
        const [messages, totalCount] = await Promise.all([
            MessageService.getConversationMessages(myId, userToChatId, {
                sort: { createdAt: -1 },
                skip,
                limit
            }),
            Message.countDocuments({
                $or: [
                    { sender: myId, receiver: userToChatId },
                    { sender: userToChatId, receiver: myId }
                ]
            })
        ]);

        // Mark messages as read
        const unreadMessages = messages.filter(msg => 
            msg.receiver.toString() === myId.toString() && !msg.readAt
        );

        if (unreadMessages.length > 0) {
            await Message.updateMany(
                { 
                    _id: { $in: unreadMessages.map(msg => msg._id) }
                },
                { 
                    $set: { readAt: new Date(), status: 'read' }
                }
            );

            // Notify sender that messages were read
            io.to(userToChatId.toString()).emit('messagesRead', {
                reader: myId,
                messageIds: unreadMessages.map(msg => msg._id)
            });
        }

        return successResponse(res, { 
            messages,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + messages.length < totalCount
            }
        }, 'Messages retrieved successfully');
    } catch (error) {
        console.error('Get messages error:', error);
        return errorResponse(res, error, 'Error retrieving messages');
    }
};

export const sendMessage = async (req, res) => {
    try {
        const validation = MessageValidation.validateNewMessage({
            content: req.body.text,
            receiver: req.params.id
        });

        if (!validation.isValid) {
            return validationError(res, validation.errors);
        }

        const { text } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        // Validate sender and receiver exist
        const [sender, receiver] = await Promise.all([
            User.findById(senderId),
            User.findById(receiverId)
        ]);

        if (!sender || !receiver) {
            return errorResponse(res, null, 'Invalid sender or receiver', 400);
        }

        let imageUrl;
        if (req.file && req.file.path) {
            try {
                const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
                    resource_type: 'auto',
                    folder: 'messages'
                });
                imageUrl = uploadResponse.secure_url;
            } catch (uploadError) {
                console.error('Cloudinary upload error:', uploadError);
                return errorResponse(res, uploadError, 'Error uploading image', 500);
            }
        }

        const messageData = {
            sender: senderId,
            receiver: receiverId,
            content: text,
            image: imageUrl,
            status: 'sent',
            readAt: null
        };

        const newMessage = await MessageService.createMessage(messageData);

        // Send notifications (email, SMS, and real-time)
        await NotificationService.sendMessageNotification(newMessage, sender, receiver);

        // Update last message timestamp for both users
        await Promise.all([
            User.findByIdAndUpdate(senderId, { lastMessageAt: new Date() }),
            User.findByIdAndUpdate(receiverId, { lastMessageAt: new Date() })
        ]);

        return successResponse(res, 
            { 
                message: newMessage,
                sender: {
                    _id: sender._id,
                    name: sender.name,
                    profilePicture: sender.profilePicture
                }
            }, 
            'Message sent successfully', 
            201
        );
    } catch (error) {
        console.error('Send message error:', error);
        return errorResponse(res, error, 'Error sending message');
    }
};

export const getEmployeeCount = async (req, res) => {
    try {
        const count = await User.countDocuments();
        return successResponse(res, { count }, 'Employee count retrieved successfully');
    } catch (error) {
        return errorResponse(res, error, 'Error retrieving employee count');
    }
};

export const getRecentMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        })
            .sort({ createdAt: -1 })
            .limit(15)
            .populate('sender', 'name email profilePicture')
            .populate('receiver', 'name email profilePicture');
            
        return successResponse(res, { messages }, 'Recent messages retrieved successfully');
    } catch (error) {
        return errorResponse(res, error, 'Error retrieving recent messages');
    }
};

export const getTodayMessageCount = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const count = await Message.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });
        
        return successResponse(res, { count }, 'Today\'s message count retrieved successfully');
    } catch (error) {
        return errorResponse(res, error, 'Error retrieving today\'s message count');
    }
};

// New endpoints for additional functionality
export const markMessageAsRead = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await MessageService.markMessageAsRead(messageId, userId);
        if (!message) {
            return errorResponse(res, null, 'Message not found', 404);
        }

        return successResponse(res, message, 'Message marked as read');
    } catch (error) {
        return errorResponse(res, error, 'Error marking message as read');
    }
};

export const searchMessages = async (req, res) => {
    try {
        const validation = MessageValidation.validateMessageSearch(req.query);
        if (!validation.isValid) {
            return validationError(res, validation.errors);
        }

        const { searchTerm } = req.query;
        const userId = req.user._id;
        
        const messages = await MessageService.searchMessages(userId, searchTerm);
        return successResponse(res, { messages }, 'Messages retrieved successfully');
    } catch (error) {
        return errorResponse(res, error, 'Error searching messages');
    }
};

export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const deletedMessage = await MessageService.deleteMessage(messageId, userId);
        if (!deletedMessage) {
            return errorResponse(res, null, 'Message not found', 404);
        }

        return successResponse(res, null, 'Message deleted successfully');
    } catch (error) {
        return errorResponse(res, error, 'Error deleting message');
    }
};

// New endpoint to update message notification preferences
export const updateMessageNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user._id;
        const { email = false, sms = false } = req.body;

        // Update user's notification preferences
        const user = await User.findByIdAndUpdate(
            userId,
            { 
                $set: { 
                    'notificationPreferences.messages': { email, sms }
                }
            },
            { new: true }
        );

        if (!user) {
            return errorResponse(res, null, 'User not found', 404);
        }

        return successResponse(res, 
            { preferences: user.notificationPreferences.messages },
            'Notification preferences updated successfully'
        );
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        return errorResponse(res, error, 'Error updating notification preferences');
    }
};