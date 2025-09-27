import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../lib/db.js';
import Settings from '../models/settings.model.js';

dotenv.config();

const seedSettings = async () => {
  try {
    await connectDB();

    const systemSettings = await Settings.findOne({ key: 'system' });

    if (!systemSettings) {
      console.log('No system settings found, seeding default settings...');
      await Settings.create({
        key: 'system',
        value: {
          autoUserCleanup: false,
          dailyBackups: true,
          maintenanceMode: false,
        },
        metadata: {
          description: 'System-wide settings',
        },
      });
      console.log('Default system settings seeded successfully.');
    } else {
      console.log('System settings already exist.');
    }
  } catch (error) {
    console.error('Error seeding settings:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
};

seedSettings();
