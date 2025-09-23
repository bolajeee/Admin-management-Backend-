import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Role from './src/models/role.model.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

// Explicitly set JWT_SECRET for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGO_URI_TEST:', process.env.MONGO_URI_TEST);
console.log('JWT_SECRET:', process.env.JWT_SECRET);

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);

  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }

  // Create default roles
  await Role.create({ name: 'admin', permissions: ['*'] });
  await Role.create({ name: 'employee', permissions: [] });
}, 60000); // 60 seconds timeout

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
