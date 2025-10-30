import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Task from '../models/task.model.js';
import Memo from '../models/memo.model.js';
import Conversation from '../models/conversation.model.js';

export const protectRoute = async (req, res, next) => {
    try {


        let token = null;

        // Check for token in cookies
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }
        // Optionally, check for token in Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                message: "Authentication required",
                code: "NO_TOKEN"
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId || decoded.id).select("-password").populate('role');
        if (!user) {
            return res.status(401).json({
                message: "User not found",
                code: "USER_NOT_FOUND"
            });
        }



        req.user = user;
        next();
    } catch (error) {

        // Send appropriate error response based on error type
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: "Invalid token",
                code: "INVALID_TOKEN"
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: "Token expired",
                code: "TOKEN_EXPIRED"
            });
        }

        return res.status(401).json({
            message: "Authentication failed",
            code: "AUTH_FAILED",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Authorization middleware to check user roles
export const authorize = (requiredPermissions = []) => {
    // Convert single permission to array
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

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

            // If no permissions specified, any authenticated user can access
            if (permissions.length === 0) {
                return next();
            }

            // Check if user has required permissions or is admin
            const userPermissions = req.user.role ? req.user.role.permissions : [];
            const isAdmin = req.user.role?.name === 'admin';

            // Check for admin role specifically or required permissions
            const hasPermission = userPermissions.includes('*') ||
                (permissions.includes('admin') && isAdmin) ||
                permissions.every(p => userPermissions.includes(p));

            if (!hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    code: 'FORBIDDEN',
                    requiredPermissions: permissions,
                    userPermissions: userPermissions
                });
            }


            next();
        } catch (error) {
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
const modelMap = {
    task: Task,
    memo: Memo,
};

export const isOwner = (modelName, idParam = 'id') => {
    return async (req, res, next) => {
        try {
            const Model = modelMap[modelName];
            if (!Model) {
                return res.status(400).json({ message: 'Invalid resource type' });
            }

            const document = await Model.findById(req.params[idParam]);

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message: `${modelName} not found`,
                    code: 'NOT_FOUND'
                });
            }

            // Check if the authenticated user is the owner
            if (document.createdBy.toString() !== req.user._id.toString()) {
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
                participants: req.user._id
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
            return res.status(500).json({
                success: false,
                message: 'Failed to verify conversation access',
                code: 'CONVERSATION_ACCESS_CHECK_FAILED'
            });
        }
    };
};
