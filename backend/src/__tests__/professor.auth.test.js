import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { verifyProfessorJWT } from '../middlewares/auth.middleware.js';
import { Professor } from '../models/professor.models.js';

describe('Professor JWT Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            header: jest.fn()
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
        process.env.ACCESS_TOKEN_SECRET = 'test_secret';
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should allow access for an active, unblocked professor', async () => {
        mockReq.header.mockReturnValue('Bearer test_token');
        jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'prof_123' });
        
        const mockProfessor = { _id: 'prof_123', isBlocked: false };
        jest.spyOn(Professor, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue(mockProfessor)
        });

        await verifyProfessorJWT(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.professor).toEqual(mockProfessor);
    });

    it('should reject access and return 403 for a blocked professor', async () => {
        mockReq.header.mockReturnValue('Bearer test_token');
        jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'prof_123' });
        
        const mockProfessor = { _id: 'prof_123', isBlocked: true };
        jest.spyOn(Professor, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue(mockProfessor)
        });

        await verifyProfessorJWT(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({ message: "BLOCKED" });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject access and return 401 for a non-existent/deleted professor', async () => {
        mockReq.header.mockReturnValue('Bearer test_token');
        jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'prof_123' });
        
        jest.spyOn(Professor, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue(null) // Professor deleted
        });

        await verifyProfessorJWT(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized request: Professor not found" });
        expect(mockNext).not.toHaveBeenCalled();
    });
});
