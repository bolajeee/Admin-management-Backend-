import Message from '../models/message.model.js';
import { queryBuilder } from '../utils/queryUtils.js';
import mongoose from 'mongoose';
import { CustomError } from '../utils/customError.js';

export class MessageService {
  static validateId(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new CustomError('Invalid ID format', 400);
    }
  }
  static async getConversationMessages(senderId, receiverId, options = {}) {
    this.validateId(senderId);
    this.validateId(receiverId);

    const baseQuery = {
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ],
      deletedFor: { $ne: senderId } // Don't show messages deleted by the requester
    };

    try {
      const { query, sort, skip, limit } = queryBuilder(baseQuery, {
        sort: { createdAt: -1 }, // Latest messages first
        ...options
      });

      const messages = await Message.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name email profilePicture lastSeen isActive')
        .populate('receiver', 'name email profilePicture lastSeen isActive')
        .lean(); // Use lean() for better performance

      return messages.map(msg => ({
        ...msg,
        isOwnMessage: msg.sender._id.toString() === senderId.toString(),
        status: this.getMessageStatus(msg, senderId)
      }));
    } catch (error) {
      throw new CustomError('Error fetching conversation messages', 500, error);
    }
  }

  static async createMessage(data) {
    this.validateId(data.sender);
    this.validateId(data.receiver);

    try {
      const message = new Message({
        ...data,
        status: 'sent',
        readAt: null,
        deliveredAt: null
      });

      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'name email profilePicture lastSeen isActive')
        .populate('receiver', 'name email profilePicture lastSeen isActive')
        .lean();

      return {
        ...populatedMessage,
        isOwnMessage: true,
        status: this.getMessageStatus(populatedMessage, data.sender)
      };
    } catch (error) {
      throw new CustomError('Error creating message', 500, error);
    }
  }

  static getMessageStatus(message, userId) {
    if (message.sender._id.toString() !== userId.toString()) {
      return 'received';
    }
    if (message.readAt) return 'read';
    if (message.deliveredAt) return 'delivered';
    return 'sent';
  }

  static async markMessageAsDelivered(messageId, receiverId) {
    this.validateId(messageId);
    this.validateId(receiverId);

    try {
      const message = await Message.findOneAndUpdate(
        { 
          _id: messageId,
          receiver: receiverId,
          deliveredAt: null
        },
        { 
          $set: { 
            deliveredAt: new Date(),
            status: 'delivered'
          }
        },
        { new: true }
      ).populate('sender receiver', 'name email profilePicture lastSeen isActive');

      if (!message) {
        throw new CustomError('Message not found or already delivered', 404);
      }

      return message;
    } catch (error) {
      throw new CustomError('Error marking message as delivered', 500, error);
    }
  }

  static async markMessageAsRead(messageId, receiverId) {
    this.validateId(messageId);
    this.validateId(receiverId);

    try {
      const message = await Message.findOneAndUpdate(
        { 
          _id: messageId,
          receiver: receiverId,
          readAt: null
        },
        { 
          $set: { 
            readAt: new Date(),
            deliveredAt: new Date(),
            status: 'read'
          }
        },
        { new: true }
      ).populate('sender receiver', 'name email profilePicture lastSeen isActive');

      if (!message) {
        throw new CustomError('Message not found or already read', 404);
      }

      return message;
    } catch (error) {
      throw new CustomError('Error marking message as read', 500, error);
    }
  }

  static async getUnreadCount(userId) {
    this.validateId(userId);

    try {
      return await Message.countDocuments({
        receiver: userId,
        readAt: null,
        deletedFor: { $ne: userId }
      });
    } catch (error) {
      throw new CustomError('Error getting unread count', 500, error);
    }
  }

  static async searchMessages(userId, searchTerm, options = {}) {
    this.validateId(userId);

    if (!searchTerm || typeof searchTerm !== 'string') {
      throw new CustomError('Invalid search term', 400);
    }

    try {
      const baseQuery = {
        $or: [
          { sender: userId },
          { receiver: userId }
        ],
        deletedFor: { $ne: userId },
        $or: [
          { content: { $regex: searchTerm, $options: 'i' } },
          { 'sender.name': { $regex: searchTerm, $options: 'i' } },
          { 'receiver.name': { $regex: searchTerm, $options: 'i' } }
        ]
      };

      const { query, sort, skip, limit } = queryBuilder(baseQuery, {
        sort: { createdAt: -1 },
        ...options
      });

      const messages = await Message.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name email profilePicture lastSeen isActive')
        .populate('receiver', 'name email profilePicture lastSeen isActive')
        .lean();

      return messages.map(msg => ({
        ...msg,
        isOwnMessage: msg.sender._id.toString() === userId.toString(),
        status: this.getMessageStatus(msg, userId)
      }));
    } catch (error) {
      throw new CustomError('Error searching messages', 500, error);
    }
  }

  static async deleteMessage(messageId, userId) {
    this.validateId(messageId);
    this.validateId(userId);

    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new CustomError('Message not found', 404);
      }

      // Add user to deletedFor array instead of actually deleting
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
      }

      // If both sender and receiver have deleted the message, actually delete it
      if (message.deletedFor.length === 2) {
        return await Message.findByIdAndDelete(messageId);
      }

      return await message.save();
    } catch (error) {
      throw new CustomError('Error deleting message', 500, error);
    }
  }

  // New methods for additional functionality
  static async markAllAsRead(senderId, receiverId) {
    this.validateId(senderId);
    this.validateId(receiverId);

    try {
      const result = await Message.updateMany(
        {
          sender: senderId,
          receiver: receiverId,
          readAt: null
        },
        {
          $set: {
            readAt: new Date(),
            deliveredAt: new Date(),
            status: 'read'
          }
        }
      );

      return result.modifiedCount;
    } catch (error) {
      throw new CustomError('Error marking messages as read', 500, error);
    }
  }

  static async getMessageStats(userId) {
    this.validateId(userId);

    try {
      const [sent, received, unread] = await Promise.all([
        Message.countDocuments({ sender: userId, deletedFor: { $ne: userId } }),
        Message.countDocuments({ receiver: userId, deletedFor: { $ne: userId } }),
        Message.countDocuments({ receiver: userId, readAt: null, deletedFor: { $ne: userId } })
      ]);

      return { sent, received, unread };
    } catch (error) {
      throw new CustomError('Error getting message stats', 500, error);
    }
  }
}
