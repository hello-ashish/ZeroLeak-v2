import { jest } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import { Result } from '../models/result.models.js';

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

describe('Result Confidentiality', () => {
    let mockResultFind;

    beforeEach(() => {
        jest.clearAllMocks();
        mockResultFind = jest.spyOn(Result, 'find');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    const createMockResult = (isReleased, studentId = 'student_123') => ({
        _id: 'res_123',
        attemptId: 'attempt_123',
        student: studentId,
        score: 95,
        totalQuestions: 100,
        exam: {
            _id: 'exam_123',
            title: 'Midterm',
            isResultReleased: isReleased
        },
        toObject: function() {
            return {
                _id: this._id,
                attemptId: this.attemptId,
                student: this.student,
                score: this.score,
                totalQuestions: this.totalQuestions,
                exam: this.exam
            };
        }
    });

    it('should strip score when exam results are not released', async () => {
        const unreleasedResult = createMockResult(false);
        mockResultFind.mockReturnValue({
            populate: jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([unreleasedResult])
            })
        });

        const res = await supertest(app).get('/api/student/results');
        expect(res.status).toBe(200);
        expect(res.body.results).toHaveLength(1);
        expect(res.body.results[0].score).toBeUndefined();
        expect(res.body.results[0].totalQuestions).toBeDefined(); // verify other fields remain
    });

    it('should include score when exam results are released', async () => {
        const releasedResult = createMockResult(true);
        mockResultFind.mockReturnValue({
            populate: jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([releasedResult])
            })
        });

        const res = await supertest(app).get('/api/student/results');
        expect(res.status).toBe(200);
        expect(res.body.results).toHaveLength(1);
        expect(res.body.results[0].score).toBe(95); // Score should be visible
    });

    it('should only return results for the authenticated student', async () => {
        // The controller explicitly queries `{ student: req.student._id }`
        // We verify that it passes the correct student ID to Result.find
        mockResultFind.mockReturnValue({
            populate: jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            })
        });

        await supertest(app).get('/api/student/results');
        expect(mockResultFind).toHaveBeenCalledWith({ student: 'student_123' });
    });
});
