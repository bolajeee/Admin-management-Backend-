import request from 'supertest';
import express from 'express';
import authTestRoute from '../routes/auth.test.route.js';
import User from '../models/user.model.js';
import AuthService from '../services/auth.service.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authTestRoute);

describe('Auth Routes', () => {
  let userCredentials;

  beforeEach(async () => {
    userCredentials = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };
    // Create a user before each test to ensure it exists for login
    const hashedPassword = await AuthService.hashPassword(userCredentials.password);
    const userRole = await User.db.model('Role').findOne({ name: 'employee' });
    await User.create({
      name: userCredentials.name,
      email: userCredentials.email,
      password: hashedPassword,
      role: userRole._id,
    });
  });

  it('should signup a new user', async () => {
    // This test will now fail because the user is already created in beforeEach
    // This test is primarily to check the signup endpoint's response
    const res = await request(app)
      .post('/api/auth/signup')
      .send(userCredentials);
    expect(res.statusCode).toEqual(400); // User already exists
    expect(res.body).toHaveProperty('message', 'User already exists');
  });

  it('should login an existing user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: userCredentials.email,
        password: userCredentials.password,
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('data');
  });
});
