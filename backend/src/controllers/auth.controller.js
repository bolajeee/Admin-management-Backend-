import { generateToken } from '../utils/generateToken.js';
import User from '../models/user.model.js';
import Message from '../models/message.model.js';
import cloudinary from "../lib/cloudinary.js";
import AuthService from '../services/auth.service.js';
import AuditService from '../services/audit.service.js';
import FileService from '../services/file.service.js';
import { AuthValidation } from '../utils/authValidation.js';
import ValidationUtils from '../utils/validationUtils.js';
import { successResponse, errorResponse, validationError } from '../utils/responseHandler.js';
import { sendPasswordResetEmail } from '../lib/email.js';


export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return errorResponse(res, null, 'User not found', 404);
        }

        // Generate a password reset token (expires in 1 hour)
        const token = await generateToken(user._id, res);
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        await sendPasswordResetEmail(email, resetLink);

        return successResponse(res, null, 'Password reset email sent');
    } catch (error) {
        return errorResponse(res, error, 'Failed to send password reset email');
    }
}

// Change password for logged-in user
export const changePassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return errorResponse(res, null, "Current and new password are required.", 400);
        }
        const user = await User.findById(userId);
        if (!user) {
            return errorResponse(res, null, "User not found.", 404);
        }
        const isMatch = await AuthService.comparePasswords(currentPassword, user.password);
        if (!isMatch) {
            return errorResponse(res, null, "Current password is incorrect.", 400);
        }
        user.password = await AuthService.hashPassword(newPassword);
        await user.save();
        return successResponse(res, null, "Password changed successfully.");
    } catch (error) {
        return errorResponse(res, error, "Failed to change password.");
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        await AuthService.resetPassword(token, newPassword);

        return successResponse(res, null, 'Password has been reset');
    } catch (error) {
        return errorResponse(res, error, 'Failed to reset password');
    }
}

export const signupUser = async (req, res) => {
    try {
        console.log('signupUser: req.body', req.body);
        const validation = AuthValidation.validateSignup(req.body);
        if (!validation.isValid) {
            console.log('signupUser: validation errors', validation.errors);
            return validationError(res, validation.errors);
        }

        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            console.log('signupUser: user already exists');
            return errorResponse(res, null, 'User already exists', 400);
        }

        const userData = {
            name,
            email,
            password, // Pass plaintext password
            role: 'employee' // Default role
        };

        const user = await AuthService.createUserWithRole(userData);
        generateToken(user._id, res);

        await AuditService.createAuditLog({
            user: user._id,
            action: 'user_signup',
        });

        return successResponse(
            res,
            AuthService.generateAuthResponse(user),
            'User created successfully',
            201
        );
    } catch (error) {
        console.error('signupUser: error', error);
        return errorResponse(res, error, 'Error creating user');
    }
}

export const loginUser = async (req, res) => {
    try {
        const validation = AuthValidation.validateLogin(req.body);
        if (!validation.isValid) {
            return validationError(res, validation.errors);
        }

        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return errorResponse(res, null, 'Invalid email or password', 400);
        }

        const isPasswordCorrect = await AuthService.comparePasswords(password, user.password);
        if (!isPasswordCorrect) {
            return errorResponse(res, null, 'Invalid email or password', 400);
        }

        const token = generateToken(user._id);
        await AuditService.createAuditLog({
            user: user._id,
            action: 'user_login',
        });
        return successResponse(res, { ...AuthService.generateAuthResponse(user), token }, 'Login successful');
    } catch (error) {
        return errorResponse(res, error, 'Error during login');
    }
}

export const logoutUser = (req, res) => {
    try {
        res.cookie("token", "", {
            maxAge: 0,
        });
        return successResponse(res, null, "Logout successful");
    } catch (error) {
        return errorResponse(res, error, "Internal server error");
    }
};


export const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        if (!req.file) {
            return errorResponse(res, null, "Please upload a profile picture", 400);
        }

        const dataURI = FileService.getDataURI(req.file);
        const cldRes = await FileService.handleUpload(dataURI);

        if (cldRes) {
            const updatedProfile = await User.findByIdAndUpdate(
                userId,
                { profilePicture: cldRes.secure_url },
                { new: true }
            );

            return successResponse(res, { profilePicture: updatedProfile.profilePicture }, "Profile updated successfully");
        }
    } catch (error) {
        return errorResponse(res, error, "Internal server error");
    }
};

export const checkAuthStatus = async (req, res) => {
    try {
        if (!req.user) {
            return errorResponse(res, null, "Unauthorized. Please login.", 401);
        }
        return successResponse(res, req.user);
    } catch (error) {
        return errorResponse(res, error, "Internal server error");
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return errorResponse(res, null, "User not found", 404);
        }
        await AuditService.createAuditLog({
            user: req.user._id,
            action: 'user_deleted',
            details: { userId: id, email: deletedUser.email }
        });
        return successResponse(res, null, "User deleted successfully");
    } catch (error) {
        return errorResponse(res, error, "Internal server error");
    }
};

export const createUser = async (req, res) => {
    try {
        const validation = AuthValidation.validateCreateUser(req.body);
        if (!validation.isValid) {
            return validationError(res, validation.errors);
        }

        const { name, email, role, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            return errorResponse(res, null, 'User with this email already exists', 400);
        }

        const user = await AuthService.createUserWithRole({ name, email, role, password });
        await AuditService.createAuditLog({
            user: req.user._id,
            action: 'user_created',
            details: { userId: user._id, email: user.email }
        });
        return successResponse(
            res, 
            AuthService.generateAuthResponse(user),
            'User created successfully',
            201
        );
    } catch (error) {
        return errorResponse(res, error, 'Failed to create user');
    }
};

// Toggle user active status (admin)
export const toggleUserActive = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) {
            return errorResponse(res, null, "User not found", 404);
        }
        user.isActive = !user.isActive;
        await user.save();
        await AuditService.createAuditLog({
            user: req.user._id,
            action: user.isActive ? 'user_activated' : 'user_deactivated',
            details: { userId: id, email: user.email }
        });
        return successResponse(res, { isActive: user.isActive }, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
        return errorResponse(res, error, "Failed to update user status");
    }
};

// Reset user password to default (admin)
export const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        if (!ValidationUtils.isValidObjectId(id)) {
            return errorResponse(res, null, 'Invalid user ID', 400);
        }

        const updatedUser = await AuthService.resetUserPassword(id);
        if (!updatedUser) {
            return errorResponse(res, null, 'User not found', 404);
        }

        await AuditService.createAuditLog({
            user: req.user._id,
            action: 'user_password_reset',
            details: { userId: id, email: updatedUser.email }
        });

        return successResponse(res, null, 'Password reset to default');
    } catch (error) {
        return errorResponse(res, error, 'Failed to reset password');
    }
};

// Get user stats (messages, joined, last message)
export const getUserStats = async (req, res) => {
    try {
        const { id } = req.params;
        if (!ValidationUtils.isValidObjectId(id)) {
            return errorResponse(res, null, 'Invalid user ID', 400);
        }

        const [user, totalMessages, lastMsg] = await Promise.all([
            User.findById(id),
            Message.countDocuments({ sender: id }),
            Message.findOne({ sender: id }).sort({ createdAt: -1 }).select('content')
        ]);

        if (!user) {
            return errorResponse(res, null, 'User not found', 404);
        }

        const stats = {
            totalMessages,
            joined: user.createdAt,
            lastMessage: lastMsg?.content || ''
        };

        return successResponse(res, stats);
    } catch (error) {
        return errorResponse(res, error, 'Failed to get user stats');
    }
};
