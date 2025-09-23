import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Role from '../models/role.model.js';

dotenv.config();

const seedRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const roles = [
      { name: 'admin', permissions: ['*'] },
      { name: 'employee', permissions: [] },
    ];

    for (const role of roles) {
      const roleExists = await Role.findOne({ name: role.name });
      if (!roleExists) {
        await Role.create(role);
        console.log(`Created role: ${role.name}`);
      }
    }

    console.log('Roles seeded successfully');
  } catch (error) {
    console.error('Error seeding roles:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

seedRoles();
