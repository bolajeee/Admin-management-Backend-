// Script to fix user roles from string to ObjectId
// Usage: node scripts/fixUserRoles.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import { connectDB } from "../lib/db.js";

dotenv.config();

async function fixUserRoles() {
  await connectDB();

  // Find all roles
  const roles = await Role.find({});
  const roleMap = {};
  roles.forEach(role => {
    roleMap[role.name] = role._id;
  });

  // Find users with string role
  const users = await User.find({ role: { $type: 'string' } });
  console.log(`Found ${users.length} users with string role.`);

  for (const user of users) {
    const roleName = user.role;
    const roleId = roleMap[roleName] || roleMap['employee'];
    if (!roleId) {
      console.error(`No ObjectId found for role '${roleName}'. Skipping user ${user.email}`);
      continue;
    }
    user.role = roleId;
    await user.save();
    console.log(`Updated user ${user.email} role to ObjectId.`);
  }

  console.log('User role fix complete.');
  process.exit(0);
}

fixUserRoles().catch(err => {
  console.error('Error fixing user roles:', err);
  process.exit(1);
});
