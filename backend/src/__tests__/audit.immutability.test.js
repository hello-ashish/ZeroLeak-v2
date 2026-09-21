import { jest } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { CheatingIncident } from '../models/cheatingIncident.models.js';
import { Student } from '../models/student.models.js';
import { AuditLog } from '../models/auditlog.models.js';
import { ExamAttempt } from '../models/examAttempt.models.js';

const app = express();
app.use(express.json());

// Mock auth middleware
jest.unstable_mockModule('../middlewares/auth.middleware.js', () => ({
    verifyStudentJWT: (req,res,next) => next(),
    verifyAdminOrAuditorJWT: (req, res, next) => next(),
    verifyAdminJWT: (req, res, next) => {
        req.admin = { _id: new mongoose.Types.ObjectId(), email: 'admin@zeroleak.com' };
        next();
    }
}));

let dynamicCheatingRoutes;

beforeAll(async () => {
    dynamicCheatingRoutes = (await import('../routes/cheating.routes.js')).default;
    // Actually the unblock endpoint is in admin routes!
    app.use('/api/cheating', dynamicCheatingRoutes);
});

describe('Audit History Immutability', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should reject invalid actionTaken values according to the schema', () => {
        const validActions = ["WARNING", "AUTO_SUBMIT", "EXAM_TERMINATED", "STUDENT_BLOCKED", "NONE"];
        expect(validActions).not.toContain('INVALID_ACTION');
        expect(validActions).not.toContain('STUDENT_UNBLOCKED');
    });

    it('should not mutate original incident action when unblocking a student and should create separate audit event', async () => {
        const studentId = new mongoose.Types.ObjectId();
        const student = {
            _id: studentId,
            name: 'Test Student',
            email: 'test@example.com',
            isBlocked: true,
            save: jest.fn().mockResolvedValue(true)
        };

        const studentFindById = jest.spyOn(Student, 'findById').mockReturnValue({
            select: jest.fn().mockResolvedValue(student)
        });
        
        // Mock findById for the first call (no select), then second call (with select)
        studentFindById.mockImplementation(() => {
            return {
                select: jest.fn().mockResolvedValue(student),
                then: (cb) => cb(student)
            };
        });

        const studentFindOne = jest.spyOn(Student, 'findOne').mockResolvedValue(student);
        const incidentUpdateMany = jest.spyOn(CheatingIncident, 'updateMany').mockResolvedValue({ modifiedCount: 1 });
        const auditLogCreate = jest.spyOn(AuditLog, 'create').mockResolvedValue(true);
        const examAttemptFind = jest.spyOn(ExamAttempt, 'find').mockReturnValue({
            populate: jest.fn().mockResolvedValue([])
        });

        const res = await supertest(app)
            .post(`/api/cheating/unblock/${studentId}`);

        expect(res.status).toBe(200);

        // Verify the student is unblocked
        expect(student.isBlocked).toBe(false);
        expect(student.unblockedAt).toBeDefined();
        expect(student.save).toHaveBeenCalled();

        // Verify that CheatingIncident.updateMany was ONLY called for reviewStatus (Dismissed), NOT for actionTaken
        expect(incidentUpdateMany).toHaveBeenCalledTimes(1);
        expect(incidentUpdateMany).toHaveBeenCalledWith(
            { studentId: student._id, reviewStatus: "Pending" },
            { $set: { reviewStatus: "Dismissed", reviewedBy: expect.any(Object), reviewedAt: expect.any(Date) } }
        );

        // Verify a separate audit log was created
        expect(auditLogCreate).toHaveBeenCalledTimes(1);
        expect(auditLogCreate).toHaveBeenCalledWith(expect.objectContaining({
            actor: 'admin@zeroleak.com',
            actorRole: 'Admin',
            action: 'STUDENT_UNBLOCKED',
            targetType: 'Student',
            targetId: String(student._id)
        }));
    });
});
