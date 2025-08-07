import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';

// Load environment variables
dotenv.config();

// Default settings object that will be added to all users
const defaultSettings = {
  notifications: {
    email: true,
    browser: true,
    sms: false
  },
  privacy: {
    showOnlineStatus: true,
    showReadReceipts: true
  }
};

// Additional system settings for admin users
const adminSystemSettings = {
  autoUserCleanup: false,
  dailyBackups: true,
  maintenanceMode: false
};

async function migrateUsers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all users without settings field
    const users = await User.find({ settings: { $exists: false } });
    console.log(`Found ${users.length} users without settings`);

    if (users.length === 0) {
      console.log('No users need migration. All users already have settings.');
      return;
    }

    // Update counter
    let updatedCount = 0;

    // Process each user
    for (const user of users) {
      // Create settings object based on user role
      let settingsToAdd = { ...defaultSettings };
      
      // Add system settings for admin users
      if (user.role === 'admin') {
        settingsToAdd.system = adminSystemSettings;
      }

      // Update user with settings
      await User.updateOne(
        { _id: user._id },
        { $set: { settings: settingsToAdd } }
      );

      updatedCount++;
      
      // Log progress every 100 users
      if (updatedCount % 100 === 0) {
        console.log(`Processed ${updatedCount} users...`);
      }
    }

    console.log(`Migration complete. Added default settings to ${updatedCount} users.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the migration
migrateUsers();