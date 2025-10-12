import User from "../models/user.model.js";
import Settings from "../models/settings.model.js";
import AuditService from "../services/audit.service.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import { NotFoundError, BadRequestError } from "../utils/errors.js";

export const getUserSettings = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Return user-specific settings with defaults
    const settings = {
      notifications: user.settings?.notifications || {
        email: true,
        browser: true,
        sms: false
      },
      privacy: user.settings?.privacy || {
        showOnlineStatus: true,
        showReadReceipts: true
      }
    };

    successResponse(res, settings, "User settings retrieved successfully");
  } catch (error) {
    errorResponse(res, error, "Failed to retrieve user settings");
  }
};

export const updateUserSettings = async (req, res, next) => {
  try {
    // If admin is updating another user's settings, use req.params.userId
    const userId = req.params.userId || req.user.userId || req.user.id || req.user._id;
    const updates = req.body;

    // Validate updates
    const allowedUpdates = ['notifications', 'privacy'];
    const invalidUpdates = Object.keys(updates).filter(key => !allowedUpdates.includes(key));
    if (invalidUpdates.length > 0) {
      throw new BadRequestError(`Invalid settings keys: ${invalidUpdates.join(', ')}`);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Apply partial updates to nested fields
    const originalSettings = JSON.parse(JSON.stringify(user.settings)); // Deep copy for audit

    // Ensure settings objects exist
    if (!user.settings) {
      user.settings = {};
    }
    if (!user.settings.notifications) {
      user.settings.notifications = {};
    }
    if (!user.settings.privacy) {
      user.settings.privacy = {};
    }

    if (updates.notifications) {
      user.settings.notifications = {
        ...user.settings.notifications,
        ...updates.notifications
      };
    }
    if (updates.privacy) {
      user.settings.privacy = {
        ...user.settings.privacy,
        ...updates.privacy
      };
    }

    await user.save();

    // Audit log
    await AuditService.createAuditLog({
      user: userId,
      action: 'user_settings_updated',
      details: { 
        originalSettings,
        newSettings: user.settings
      }
    });

    successResponse(res, user.settings, "Settings updated successfully");
  } catch (error) {
    errorResponse(res, error, "Failed to update user settings");
  }
};

export const getSystemSettings = async (req, res, next) => {
  try {
    const systemSettings = await Settings.findOne({ key: 'system' });

    if (!systemSettings) {
      throw new NotFoundError("System settings not found. Please run the seeder.");
    }

    successResponse(res, systemSettings.value, "System settings retrieved successfully");
  } catch (error) {
    errorResponse(res, error, "Failed to retrieve system settings");
  }
};

export const updateSystemSettings = async (req, res, next) => {
  try {
    const updates = req.body;

    const systemSettings = await Settings.findOne({ key: 'system' });
    if (!systemSettings) {
      throw new NotFoundError("System settings not found. Please run the seeder.");
    }

    // Validate updates
    const allowedUpdates = ['autoUserCleanup', 'dailyBackups', 'maintenanceMode'];
    const invalidUpdates = Object.keys(updates).filter(key => !allowedUpdates.includes(key));
    if (invalidUpdates.length > 0) {
      throw new BadRequestError(`Invalid system settings keys: ${invalidUpdates.join(', ')}`);
    }

    const originalSettings = JSON.parse(JSON.stringify(systemSettings.value)); // Deep copy

    // Apply partial updates
    systemSettings.value = {
      ...systemSettings.value,
      ...updates
    };

    await systemSettings.save();

    // Audit log
    await AuditService.createAuditLog({
      user: req.user._id,
      action: 'system_settings_updated',
      details: { 
        originalSettings,
        newSettings: systemSettings.value
      }
    });

    successResponse(res, systemSettings.value, "System settings updated successfully");
  } catch (error) {
    errorResponse(res, error, "Failed to update system settings");
  }
};
