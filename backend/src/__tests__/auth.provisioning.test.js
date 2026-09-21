import { jest } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import { Admin } from '../models/admin.models.js';
import { Auditor } from '../models/auditor.models.js';
import { AuditLog } from '../models/auditlog.models.js';

// We must dynamically import the routes AFTER mocking the middleware
let dynamicAdminRoutes;
let dynamicAuditorRoutes;

// Setup Express App
const app = express();
app.use(express.json());

// Mock middlewares FIRST before routes that use them
jest.unstable_mockModule('../middlewares/auth.middleware.js', () => ({
    verifyAdminJWT: (req, res, next) => {
        req.admin = { _id: 'admin_123', email: 'admin@test.com' };
        next();
    },
    verifyAuditorJWT: (req, res, next) => {
        req.auditor = { _id: 'auditor_123', email: 'auditor@test.com' };
        next();
    },
    verifyAdminOrAuditorJWT: (req, res, next) => {
        req.admin = { _id: 'admin_123', email: 'admin@test.com' };
        req.userRole = 'Admin';
        next();
    }
}));


beforeAll(async () => {
    // Dynamic import to pick up mocks
    dynamicAdminRoutes = (await import('../routes/admin.routes.js')).default;
    dynamicAuditorRoutes = (await import('../routes/auditor.routes.js')).default;
    
    app.use('/api/admin', dynamicAdminRoutes);
    app.use('/api/auditor', dynamicAuditorRoutes);
});

describe('Auth Provisioning', () => {
    let mockAdminCount;
    let mockAuditorCount;
    let mockAdminCreate;
    let mockAuditorCreate;
    let mockAdminFindById;
    let mockAuditorFindById;
    let mockAdminFindOne;
    let mockAuditorFindOne;
    let mockAuditLogCreate;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.ADMIN_BOOTSTRAP_SECRET = 'admin_secret';
        process.env.AUDITOR_BOOTSTRAP_SECRET = 'auditor_secret';
        
        mockAdminCount = jest.spyOn(Admin, 'countDocuments');
        mockAuditorCount = jest.spyOn(Auditor, 'countDocuments');
        mockAdminCreate = jest.spyOn(Admin, 'create');
        mockAuditorCreate = jest.spyOn(Auditor, 'create');
        mockAdminFindById = jest.spyOn(Admin, 'findById');
        mockAuditorFindById = jest.spyOn(Auditor, 'findById');
        mockAdminFindOne = jest.spyOn(Admin, 'findOne');
        mockAuditorFindOne = jest.spyOn(Auditor, 'findOne');
        mockAuditLogCreate = jest.spyOn(AuditLog, 'create').mockResolvedValue({});
        
        mockAdminCreate.mockResolvedValue({ _id: 'new_admin_id' });
        mockAdminFindById.mockReturnValue({ select: jest.fn().mockResolvedValue({}) });
        
        mockAuditorCreate.mockResolvedValue({ _id: 'new_auditor_id' });
        mockAuditorFindById.mockReturnValue({ select: jest.fn().mockResolvedValue({}) });
    });

    afterEach(() => {
        mockAdminCount.mockRestore();
        mockAuditorCount.mockRestore();
        mockAdminCreate.mockRestore();
        mockAuditorCreate.mockRestore();
        mockAdminFindById.mockRestore();
        mockAuditorFindById.mockRestore();
        mockAdminFindOne.mockRestore();
        mockAuditorFindOne.mockRestore();
        mockAuditLogCreate.mockRestore();
    });

    describe('Admin Bootstrap', () => {
        it('should reject if secret is incorrect', async () => {
            const res = await supertest(app).post('/api/admin/bootstrap').send({
                adminId: 'ADMIN-1',
                email: 'test@admin.com',
                password: 'password',
                bootstrapSecret: 'wrong_secret'
            });
            expect(res.status).toBe(401);
        });

        it('should reject if admin already exists', async () => {
            mockAdminCount.mockResolvedValue(1);
            
            const res = await supertest(app).post('/api/admin/bootstrap').send({
                adminId: 'ADMIN-1',
                email: 'test@admin.com',
                password: 'password',
                bootstrapSecret: 'admin_secret'
            });
            expect(res.status).toBe(403);
        });

        it('should create admin if secret is correct and no admin exists', async () => {
            mockAdminCount.mockResolvedValue(0);
            
            const res = await supertest(app).post('/api/admin/bootstrap').send({
                adminId: 'ADMIN-1',
                email: 'test@admin.com',
                password: 'password',
                bootstrapSecret: 'admin_secret'
            });
            expect(res.status).toBe(201);
            expect(mockAdminCreate).toHaveBeenCalled();
        });
    });

    describe('Auditor Bootstrap', () => {
        it('should reject if secret is incorrect', async () => {
            const res = await supertest(app).post('/api/auditor/bootstrap').send({
                auditorId: 'AUD-1',
                email: 'test@auditor.com',
                password: 'password',
                name: 'Auditor',
                bootstrapSecret: 'wrong_secret'
            });
            expect(res.status).toBe(401);
        });

        it('should reject if auditor already exists', async () => {
            mockAuditorCount.mockResolvedValue(1);
            
            const res = await supertest(app).post('/api/auditor/bootstrap').send({
                auditorId: 'AUD-1',
                email: 'test@auditor.com',
                password: 'password',
                name: 'Auditor',
                bootstrapSecret: 'auditor_secret'
            });
            expect(res.status).toBe(403);
        });

        it('should create auditor if secret is correct and no auditor exists', async () => {
            mockAuditorCount.mockResolvedValue(0);
            
            const res = await supertest(app).post('/api/auditor/bootstrap').send({
                auditorId: 'AUD-1',
                email: 'test@auditor.com',
                password: 'password',
                name: 'Auditor',
                bootstrapSecret: 'auditor_secret'
            });
            expect(res.status).toBe(201);
            expect(mockAuditorCreate).toHaveBeenCalled();
        });
    });

    describe('Authenticated Creation', () => {
        it('should allow creating admin if logged in as admin', async () => {
            mockAdminFindOne.mockResolvedValue(null);
            
            const res = await supertest(app).post('/api/admin/admins').send({
                adminId: 'ADMIN-2',
                email: 'test2@admin.com',
                password: 'password'
            });
            expect(res.status).toBe(201);
            expect(mockAdminCreate).toHaveBeenCalled();
        });

        it('should allow creating auditor if logged in as admin/auditor', async () => {
            mockAuditorFindOne.mockResolvedValue(null);
            
            const res = await supertest(app).post('/api/auditor/auditors').send({
                auditorId: 'AUD-2',
                email: 'test2@auditor.com',
                name: 'Test',
                password: 'password'
            });
            expect(res.status).toBe(201);
            expect(mockAuditorCreate).toHaveBeenCalled();
        });
    });
});
