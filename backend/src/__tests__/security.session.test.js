import { AuditLog } from '../models/auditlog.models.js';
import { jest } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { loginAdmin, logoutAdmin } from '../controllers/admin.controllers.js';
import { verifyAdminJWT } from '../middlewares/auth.middleware.js';
import { Admin } from '../models/admin.models.js';
import jwt from 'jsonwebtoken';

describe('Secure Session (Cookie) Implementation', () => {
    let app;
    let mockAdmin;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(cookieParser());

        mockAdmin = {
            _id: new mongoose.Types.ObjectId(),
            email: 'admin@test.com',
            isPasswordCorrect: jest.fn().mockResolvedValue(true),
            generateAccessToken: jest.fn().mockReturnValue('mock-jwt-token')
        };

        jest.spyOn(Admin, 'findOne').mockResolvedValue(mockAdmin);
        jest.spyOn(Admin, 'findById').mockReturnValue({ select: jest.fn().mockResolvedValue(mockAdmin) });
        jest.spyOn(AuditLog, 'create').mockResolvedValue(true);
        
        app.post('/login', loginAdmin);
        app.post('/logout', logoutAdmin);
        
        app.get('/protected', verifyAdminJWT, (req, res) => {
            res.status(200).json({ message: 'Success', admin: req.admin });
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should set an HttpOnly cookie on successful login', async () => {
        const res = await supertest(app).post('/login').send({ email: 'admin@test.com', password: 'password123' });
        expect(res.status).toBe(200);
        
        const setCookie = res.headers['set-cookie'];
        expect(setCookie).toBeDefined();
        
        const cookieString = setCookie[0];
        expect(cookieString).toContain('adminToken=mock-jwt-token');
        expect(cookieString).toContain('HttpOnly');
        expect(cookieString).toContain('SameSite=Strict');
    });

    it('should clear the cookie on logout', async () => {
        const res = await supertest(app).post('/logout');
        expect(res.status).toBe(200);
        
        const setCookie = res.headers['set-cookie'];
        expect(setCookie).toBeDefined();
        
        const cookieString = setCookie[0];
        expect(cookieString).toContain('adminToken=;');
        expect(cookieString.toLowerCase()).toContain('expires=thu, 01 jan 1970 00:00:00 gmt');
    });

    it('should allow access to protected routes with a valid cookie', async () => {
        // Mock JWT verification
        jest.spyOn(jwt, 'verify').mockReturnValue({ id: mockAdmin._id });

        const res = await supertest(app)
            .get('/protected')
            .set('Cookie', ['adminToken=mock-jwt-token']);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Success');
    });
    
    it('should allow access to protected routes with a valid Authorization header (fallback)', async () => {
        // Mock JWT verification
        jest.spyOn(jwt, 'verify').mockReturnValue({ id: mockAdmin._id });

        const res = await supertest(app)
            .get('/protected')
            .set('Authorization', 'Bearer mock-jwt-token');

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Success');
    });

    it('should deny access to protected routes without a cookie or header', async () => {
        const res = await supertest(app).get('/protected');

        expect(res.status).toBe(401);
        expect(res.body.message).toContain('No token provided');
    });
});
