import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import supertest from 'supertest';
import express from 'express';
import { verifyStudentJWT } from '../middlewares/auth.middleware.js';
import { Student } from '../models/student.models.js';
import { loginStudent } from '../controllers/student.controllers.js';

describe('Student Blocked-Account Behavior', () => {

    // ── Middleware-level tests ──────────────────────────────────────────
    describe('verifyStudentJWT middleware', () => {
        let mockReq, mockRes, mockNext;

        beforeEach(() => {
            mockReq = { header: jest.fn(), cookies: {} };
            mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            mockNext = jest.fn();
            process.env.ACCESS_TOKEN_SECRET = 'test_secret';
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should allow access for an active, unblocked student', async () => {
            mockReq.header.mockReturnValue('Bearer test_token');
            jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'student_123' });

            const mockStudent = { _id: 'student_123', isBlocked: false };
            jest.spyOn(Student, 'findById').mockReturnValue({
                select: jest.fn().mockResolvedValue(mockStudent)
            });

            await verifyStudentJWT(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.student).toEqual(mockStudent);
        });

        it('should reject access with 403 for a blocked student', async () => {
            mockReq.header.mockReturnValue('Bearer test_token');
            jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'student_123' });

            const mockStudent = { _id: 'student_123', isBlocked: true };
            jest.spyOn(Student, 'findById').mockReturnValue({
                select: jest.fn().mockResolvedValue(mockStudent)
            });

            await verifyStudentJWT(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'BLOCKED' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject access with 401 for a deleted/nonexistent student', async () => {
            mockReq.header.mockReturnValue('Bearer test_token');
            jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'student_nonexistent' });

            jest.spyOn(Student, 'findById').mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            await verifyStudentJWT(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject access with 401 when no token is provided', async () => {
            mockReq.header.mockReturnValue(undefined);

            await verifyStudentJWT(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    // ── Login-level tests ──────────────────────────────────────────────
    describe('loginStudent controller', () => {
        let app;

        beforeEach(() => {
            app = express();
            app.use(express.json());
            app.post('/login', loginStudent);
            jest.clearAllMocks();
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should reject login for a blocked student with 403', async () => {
            const mockStudent = {
                _id: new mongoose.Types.ObjectId(),
                email: 'blocked@test.com',
                isBlocked: true,
                isPasswordCorrect: jest.fn().mockResolvedValue(true)
            };
            jest.spyOn(Student, 'findOne').mockResolvedValue(mockStudent);

            const res = await supertest(app).post('/login').send({
                email: 'blocked@test.com',
                password: 'password123'
            });

            expect(res.status).toBe(403);
            // Password should NOT even be checked for blocked accounts
            expect(mockStudent.isPasswordCorrect).not.toHaveBeenCalled();
        });

        it('should return the same 401 error for unknown email and wrong password (no account enumeration)', async () => {
            // Unknown email
            jest.spyOn(Student, 'findOne').mockResolvedValue(null);
            const res1 = await supertest(app).post('/login').send({
                email: 'unknown@test.com',
                password: 'password123'
            });

            jest.restoreAllMocks();

            // Known email, wrong password
            const mockStudent = {
                _id: new mongoose.Types.ObjectId(),
                email: 'known@test.com',
                isBlocked: false,
                isPasswordCorrect: jest.fn().mockResolvedValue(false)
            };
            jest.spyOn(Student, 'findOne').mockResolvedValue(mockStudent);
            const res2 = await supertest(app).post('/login').send({
                email: 'known@test.com',
                password: 'wrongpassword'
            });

            expect(res1.status).toBe(401);
            expect(res2.status).toBe(401);
            expect(res1.body.message).toBe(res2.body.message);
        });
    });
});
