import { jest } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { loginAdmin } from '../controllers/admin.controllers.js';
import { Admin } from '../models/admin.models.js';

describe('Auth Error Consistency', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.post('/login', loginAdmin);
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return exactly the same 401 error for an unknown email', async () => {
        jest.spyOn(Admin, 'findOne').mockResolvedValue(null);

        const res = await supertest(app).post('/login').send({ email: 'unknown@test.com', password: 'password123' });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Invalid email or password');
    });

    it('should return exactly the same 401 error for a known email but wrong password', async () => {
        const mockAdmin = {
            _id: new mongoose.Types.ObjectId(),
            email: 'admin@test.com',
            isPasswordCorrect: jest.fn().mockResolvedValue(false)
        };
        jest.spyOn(Admin, 'findOne').mockResolvedValue(mockAdmin);

        const res = await supertest(app).post('/login').send({ email: 'admin@test.com', password: 'wrongpassword' });

        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Invalid email or password');
    });
});
