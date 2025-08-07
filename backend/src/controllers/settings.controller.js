import User from "../models/user.model.js";

export const getUserSettings = async (req, res) => {
  try {  
    const userId = req.user.userId || req.user.id || req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // This assumes you've added settings fields to your user model
    // If not, you'll need to create a separate settings model
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
    
    // Add system settings for admin users
    if (user.role === "admin") {
      settings.system = {
        autoUserCleanup: false,
        dailyBackups: true,
        maintenanceMode: false
      };
    }
    
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error getting user settings:", error);
    res.status(500).json({ message: "Failed to get user settings" });
  }
};

export const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
     const updatedSettings = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Ensure we're only updating allowed settings
    const allowedSettings = {
      notifications: updatedSettings.notifications,
      privacy: updatedSettings.privacy
    };
    
    // Add system settings for admin users
    if (user.role === "admin" && updatedSettings.system) {
      allowedSettings.system = updatedSettings.system;
    }
    
    // Update user settings
    user.settings = allowedSettings;
    await user.save();
    
    res.status(200).json({ message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating user settings:", error);
    res.status(500).json({ message: "Failed to update user settings" });
  }
};