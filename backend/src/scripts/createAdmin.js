import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import AuthService from '../services/auth.service.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@example.com';
    const adminPassword = 'AdminPassword123!';

    const adminRole = await Role.findOne({ name: 'admin' });
    if (!adminRole) {
      console.log('Admin role not found. Creating it now.');
      await Role.create({ name: 'admin', permissions: ['*'] });
    }

    const adminExists = await User.findOne({ email: adminEmail });
    if (adminExists) {
      console.log('Admin user already exists.');
      process.exit(0);
    }

    const user = await AuthService.createUserWithRole({
      name: 'Admin User',
      email: adminEmail,
      password: adminPassword,
      role: 'admin'
    });

    console.log('Admin user created successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

createAdmin();
