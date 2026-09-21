import { jest } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import { Exam } from '../models/exam.models.js';
import { Result } from '../models/result.models.js';
import { ExamAttempt } from '../models/examAttempt.models.js';

// Setup Express App
const app = express();
app.use(express.json());

// Mock middlewares and services FIRST before importing routes
jest.unstable_mockModule('../middlewares/auth.middleware.js', () => ({
    verifyStudentJWT: (req, res, next) => {
        req.student = { _id: 'student_123', email: 'student@test.com' };
        next();
    },
    verifyAdminJWT: (req, res, next) => next()
}));

jest.unstable_mockModule('../Services/crypto.service.js', () => ({
    verifyQuestionIntegrity: jest.fn().mockReturnValue(true),
    decryptQuestionContent: jest.fn().mockReturnValue({ correctAnswerIndex: 0 })
}));

jest.unstable_mockModule('../Services/merkle.service.js', () => ({
    buildMerkleRoot: jest.fn().mockReturnValue('valid_root')
}));

jest.unstable_mockModule('../blockchain/commitment.service.js', () => ({
    canonicalize: jest.fn().mockReturnValue({}),
    sha256: jest.fn().mockReturnValue('hash'),
    createCommitment: jest.fn().mockResolvedValue({ eventId: 'evt_1', canonicalHash: 'hash' })
}));

let dynamicStudentRoutes;

beforeAll(async () => {
    dynamicStudentRoutes = (await import('../routes/student.routes.js')).default;
    app.use('/api/student', dynamicStudentRoutes);
});

describe('Exam Lifecycle and Server-Authoritative Timing', () => {
    let mockExamFindById;
    let mockAttemptFindOne;
    let mockAttemptCreate;
    let mockResultCreate;
    let mockExamFind;

    beforeEach(() => {
        jest.clearAllMocks();
        mockExamFindById = jest.spyOn(Exam, 'findById');
        mockExamFind = jest.spyOn(Exam, 'find');
        mockAttemptFindOne = jest.spyOn(ExamAttempt, 'findOne');
        mockAttemptCreate = jest.spyOn(ExamAttempt, 'create');
        mockResultCreate = jest.spyOn(Result, 'create');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const createMockExam = (overrides = {}) => {
        const defaultExam = {
            _id: 'exam_123',
            status: 'Live',
            scheduledAt: new Date(Date.now() - 3600000), // 1 hour ago
            endsAt: new Date(Date.now() + 3600000), // 1 hour from now
            durationMinutes: 60,
            questionMerkleRoot: 'valid_root',
            questions: [{
                _id: 'q1',
                encryptedContent: 'enc',
                contentHash: 'hash'
            }]
        };
        return { ...defaultExam, ...overrides };
    };

    describe('GET /api/student/exams/:id', () => {
        it('should reject access to Draft exams', async () => {
            mockExamFindById.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(createMockExam({ status: 'Draft' }))
                })
            });

            const res = await supertest(app).get('/api/student/exams/exam_123');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe("Exam is not available.");
        });

        it('should reject access to Scheduled exams if now < scheduledAt', async () => {
            mockExamFindById.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(createMockExam({ 
                        status: 'Scheduled',
                        scheduledAt: new Date(Date.now() + 3600000) // 1 hour in the future
                    }))
                })
            });

            const res = await supertest(app).get('/api/student/exams/exam_123');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe("Exam has not started yet.");
        });

        it('should reject access to Completed exams', async () => {
            mockExamFindById.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(createMockExam({ status: 'Completed' }))
                })
            });

            const res = await supertest(app).get('/api/student/exams/exam_123');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe("Exam has already ended.");
        });

        it('should reject access to Live exams if now >= endsAt', async () => {
            mockExamFindById.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(createMockExam({ 
                        status: 'Live',
                        endsAt: new Date(Date.now() - 3600000) // 1 hour ago
                    }))
                })
            });

            const res = await supertest(app).get('/api/student/exams/exam_123');
            expect(res.status).toBe(403);
            expect(res.body.message).toBe("Exam has already ended.");
        });
    });

    describe('POST /api/student/exams/:id/start', () => {
        it('should create an InProgress attempt for a valid Live exam', async () => {
            mockExamFindById.mockResolvedValue(createMockExam({ status: 'Live' }));
            mockAttemptFindOne.mockResolvedValue(null);
            mockAttemptCreate.mockResolvedValue({ _id: 'attempt_123', status: 'InProgress', startedAt: new Date() });

            const res = await supertest(app).post('/api/student/exams/exam_123/start');
            expect(res.status).toBe(201);
            expect(res.body.message).toBe("Exam attempt started successfully.");
            expect(mockAttemptCreate).toHaveBeenCalled();
        });

        it('should reject if exam is not started yet (Scheduled future)', async () => {
            mockExamFindById.mockResolvedValue(createMockExam({ 
                status: 'Scheduled',
                scheduledAt: new Date(Date.now() + 3600000)
            }));

            const res = await supertest(app).post('/api/student/exams/exam_123/start');
            expect(res.status).toBe(403);
        });
    });

    describe('POST /api/student/results (Submission)', () => {
        it('should reject submission if no InProgress attempt exists', async () => {
            mockAttemptFindOne.mockResolvedValue(null);

            const res = await supertest(app).post('/api/student/results').send({
                examId: 'exam_123',
                answers: []
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toContain("No active exam attempt found");
        });

        it('should reject submission if after endsAt', async () => {
            mockAttemptFindOne.mockResolvedValue({ status: 'InProgress', startedAt: new Date(), expiresAt: new Date(Date.now() + 3600000) });
            mockExamFindById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(createMockExam({ 
                    endsAt: new Date(Date.now() - 1000) // ended 1 second ago
                }))
            });

            const res = await supertest(app).post('/api/student/results').send({
                examId: 'exam_123',
                answers: []
            });
            expect(res.status).toBe(403);
            expect(res.body.message).toContain("Exam has already ended");
        });

        it('should reject submission if after expiresAt (time limit expired)', async () => {
            const expiredDate = new Date(Date.now() - 1000); // 1 second ago
            mockAttemptFindOne.mockResolvedValue({ 
                status: 'InProgress', 
                startedAt: new Date(Date.now() - 7200000), 
                expiresAt: expiredDate,
                save: jest.fn()
            });
            mockExamFindById.mockReturnValue({
                populate: jest.fn().mockResolvedValue(createMockExam({ 
                    durationMinutes: 60,
                    endsAt: new Date(Date.now() + 3600000) // Ends in future, but personal time limit expired
                }))
            });

            const res = await supertest(app).post('/api/student/results').send({
                examId: 'exam_123',
                answers: []
            });
            expect(res.status).toBe(403);
            expect(res.body.message).toContain("Exam time limit has expired");
        });

        it('should reject duplicate submission when attempt is already Submitted', async () => {
            mockAttemptFindOne.mockResolvedValue({
                status: 'Submitted',
                startedAt: new Date(),
                expiresAt: new Date(Date.now() + 3600000)
            });

            const res = await supertest(app).post('/api/student/results').send({
                examId: 'exam_123',
                answers: []
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toContain("No active exam attempt found");
        });

        it('should reject submission when attempt is Terminated', async () => {
            mockAttemptFindOne.mockResolvedValue({
                status: 'Terminated',
                startedAt: new Date(),
                expiresAt: new Date(Date.now() + 3600000)
            });

            const res = await supertest(app).post('/api/student/results').send({
                examId: 'exam_123',
                answers: []
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toContain("No active exam attempt found");
        });
    });

    describe('POST /api/student/exams/:id/start (Double-Start Prevention)', () => {
        it('should return existing attempt if student already has an InProgress attempt', async () => {
            mockExamFindById.mockResolvedValue(createMockExam({ status: 'Live' }));
            mockAttemptFindOne.mockResolvedValue({
                _id: 'existing_attempt',
                status: 'InProgress',
                startedAt: new Date()
            });

            const res = await supertest(app).post('/api/student/exams/exam_123/start');
            // Should not create a new attempt
            expect(mockAttemptCreate).not.toHaveBeenCalled();
            // Should return 200 with existing attempt info
            expect(res.status).toBe(200);
        });
    });
});
