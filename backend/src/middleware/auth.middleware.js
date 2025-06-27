import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
    try {
      let token = null;
  
      // ✅ Check in cookies
    } catch (error) {
        console.error('Authentication error:', error);
        
        let message = 'Invalid or expired token';
        let statusCode = 401;
        let errorCode = 'INVALID_TOKEN';
        
        if (error.name === 'TokenExpiredError') {
            message = 'Token has expired';
            errorCode = 'TOKEN_EXPIRED';
        } else if (error.name === 'JsonWebTokenError') {
            message = 'Invalid token';
            errorCode = 'INVALID_TOKEN';
        } else {
            statusCode = 500;
            message = 'Authentication failed';
            errorCode = 'AUTH_FAILED';
        }
        
        return res.status(statusCode).json({ 
            success: false,
            message,
            code: errorCode
        });
    }
};

// Authorization middleware to check user roles
export const authorize = (roles = []) => {
    // Convert single role to array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    return async (req, res, next) => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // If no roles specified, any authenticated user can access
            if (allowedRoles.length === 0) {
                return next();
            }

            // Check if user has required role
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    code: 'FORBIDDEN',
                    requiredRoles: allowedRoles,
                    userRole: req.user.role
                });
            }


            next();
        } catch (error) {
            console.error('Authorization error:', error);
            return res.status(500).json({
                success: false,
                message: 'Authorization failed',
                code: 'AUTHORIZATION_FAILED',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    };
};

// Middleware to check if the user is the owner of the resource
export const isOwner = (modelName, idParam = 'id') => {
    return async (req, res, next) => {
        try {
            const Model = require(`../models/${modelName}.model.js`);
            const document = await Model.findById(req.params[idParam]);
            
            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: `${modelName} not found`,
                    code: 'NOT_FOUND'
                });
            }

            // Check if the authenticated user is the owner
            if (document.createdBy.toString() !== req.userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this resource',
                    code: 'NOT_OWNER'
                });
            }

            // Attach document to request for use in route handlers
            req.document = document;
            next();
        } catch (error) {
            console.error(`Error in isOwner middleware for ${modelName}:`, error);
            return res.status(500).json({
                success: false,
                message: 'Authorization check failed',
                code: 'AUTHORIZATION_CHECK_FAILED'
            });
        }
    };
};

// Middleware to check if the user is a participant in a conversation
export const isParticipant = (conversationIdParam = 'conversationId') => {
    return async (req, res, next) => {
        try {
            const conversationId = req.params[conversationIdParam];
            
            // Check if user is a participant in the conversation
            const isParticipant = await Conversation.exists({
                _id: conversationId,
                participants: req.userId
            });

            if (!isParticipant) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this conversation',
                    code: 'NOT_PARTICIPANT'
                });
            }

            next();
        } catch (error) {
            console.error('Error in isParticipant middleware:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify conversation access',
                code: 'CONVERSATION_ACCESS_CHECK_FAILED'
            });
        }
    };
};
