import { jest } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import { Batch } from '../models/batch.models.js';

// Setup Express App
const app = express();
app.use(express.json());

// Mock middleware FIRST before routes that use them
jest.unstable_mockModule('../middlewares/auth.middleware.js', () => ({
    verifyProfessorJWT: (req, res, next) => {
        req.professor = { _id: 'prof_123', email: 'prof@test.com' };
        next();
    }
}));

let dynamicProfessorRoutes;

beforeAll(async () => {
    // Dynamic import to pick up mocks
    dynamicProfessorRoutes = (await import('../routes/professor.routes.js')).default;
    app.use('/api/professor', dynamicProfessorRoutes);
});

describe('Professor Authorization & IDOR', () => {
    let mockBatchFindOne;
    let mockBatchFindOneAndUpdate;

    beforeEach(() => {
        jest.clearAllMocks();
        mockBatchFindOne = jest.spyOn(Batch, 'findOne');
        mockBatchFindOneAndUpdate = jest.spyOn(Batch, 'findOneAndUpdate');
    });

    afterEach(() => {
        mockBatchFindOne.mockRestore();
        mockBatchFindOneAndUpdate.mockRestore();
    });

    const testIDOR = async (method, url, payload = {}) => {
        // Mock finding a batch - but returning null (simulating batch doesn't belong to the professor)
        mockBatchFindOne.mockResolvedValue(null);
        mockBatchFindOneAndUpdate.mockResolvedValue(null);

        const res = await supertest(app)[method](url).send(payload);
        
        expect(res.status).toBe(404);
        expect(res.body.message).toBe("Batch not found.");
    };

    const testAuthorized = async (method, url, payload = {}) => {
        // Mock finding a valid batch belonging to the professor
        const mockBatch = { 
            _id: 'batch_123', 
            createdBy: 'prof_123',
            status: 'Draft',
            subject: 'Math',
            questions: {
                push: jest.fn(),
                id: jest.fn().mockReturnValue({ set: jest.fn() }),
                pull: jest.fn()
            },
            save: jest.fn().mockResolvedValue(true)
        };
        mockBatchFindOne.mockResolvedValue(mockBatch);
        mockBatchFindOneAndUpdate.mockResolvedValue(mockBatch);

        const res = await supertest(app)[method](url).send(payload);
        
        // Either 200 or 201 depending on the route, but not 404
        expect(res.status).not.toBe(404);
    };

    describe('addQuestionToBatch', () => {
        it('should prevent adding a question to a batch created by another professor', async () => {
            await testIDOR('post', '/api/professor/batches/batch_456/questions', { text: "What is 2+2?" });
        });
        it('should allow adding a question to own batch', async () => {
            await testAuthorized('post', '/api/professor/batches/batch_123/questions', { text: "What is 2+2?" });
        });
    });

    describe('bulkAddQuestionsToBatch', () => {
        it('should prevent bulk adding questions to another professor\'s batch', async () => {
            await testIDOR('post', '/api/professor/batches/batch_456/questions/bulk', { questions: [{ text: "1" }] });
        });
        it('should allow bulk adding to own batch', async () => {
            await testAuthorized('post', '/api/professor/batches/batch_123/questions/bulk', { questions: [{ text: "1" }] });
        });
    });

    describe('editQuestionInBatch', () => {
        it('should prevent editing a question in another professor\'s batch', async () => {
            await testIDOR('put', '/api/professor/batches/batch_456/questions/q_789', { text: "Updated" });
        });
        it('should allow editing in own batch', async () => {
            await testAuthorized('put', '/api/professor/batches/batch_123/questions/q_789', { text: "Updated" });
        });
    });

    describe('deleteQuestionFromBatch', () => {
        it('should prevent deleting a question in another professor\'s batch', async () => {
            await testIDOR('delete', '/api/professor/batches/batch_456/questions/q_789');
        });
        it('should allow deleting in own batch', async () => {
            await testAuthorized('delete', '/api/professor/batches/batch_123/questions/q_789');
        });
    });

    describe('submitBatch', () => {
        it('should prevent submitting another professor\'s batch', async () => {
            await testIDOR('post', '/api/professor/batches/batch_456/submit');
        });
        it('should allow submitting own batch', async () => {
            await testAuthorized('post', '/api/professor/batches/batch_123/submit');
        });
    });
});
