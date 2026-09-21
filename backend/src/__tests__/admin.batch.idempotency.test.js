import { jest } from '@jest/globals';
import supertest from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { Batch } from '../models/batch.models.js';
import { Question } from '../models/question.models.js';
import { IntegrityOutbox } from '../models/integrityOutbox.models.js';

const app = express();
app.use(express.json());

// Mock auth middleware
jest.unstable_mockModule('../middlewares/auth.middleware.js', () => ({
    verifyAdminJWT: (req, res, next) => {
        req.admin = { _id: new mongoose.Types.ObjectId(), email: 'admin@test.com' };
        next();
    }
}));

let dynamicAdminRoutes;

beforeAll(async () => {
    dynamicAdminRoutes = (await import('../routes/admin.routes.js')).default;
    app.use('/api/admin', dynamicAdminRoutes);
});

describe('Batch Idempotency', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should idempotently handle duplicate batch acceptance', async () => {
        const batchId = new mongoose.Types.ObjectId();
        const commitmentId = `Batch_${batchId}_1_QUESTION_BATCH`;

        const mockBatch = {
            _id: batchId,
            status: 'Accepted',
            commitmentId: commitmentId,
            save: jest.fn().mockResolvedValue(true)
        };

        const mockOutbox = {
            eventId: commitmentId,
            status: 'CONFIRMED'
        };

        const batchFindById = jest.spyOn(Batch, 'findById').mockResolvedValue(mockBatch);
        const outboxFindOne = jest.spyOn(IntegrityOutbox, 'findOne').mockResolvedValue(mockOutbox);

        const res = await supertest(app)
            .post(`/api/admin/batches/${batchId}/review`)
            .send({ action: 'Accept' });

        expect(res.status).toBe(200);
        expect(res.body.message).toContain('Batch is already accepted.');
        expect(batchFindById).toHaveBeenCalledWith(batchId.toString());
        expect(outboxFindOne).toHaveBeenCalledWith({ eventId: commitmentId });
    });

    it('should reset outbox retry on FAILED status', async () => {
        const batchId = new mongoose.Types.ObjectId();
        const commitmentId = `Batch_${batchId}_1_QUESTION_BATCH`;

        const mockBatch = {
            _id: batchId,
            status: 'Accepted',
            commitmentId: commitmentId,
        };

        const mockOutbox = {
            eventId: commitmentId,
            status: 'FAILED',
            retryCount: 5,
            save: jest.fn().mockResolvedValue(true)
        };

        jest.spyOn(Batch, 'findById').mockResolvedValue(mockBatch);
        jest.spyOn(IntegrityOutbox, 'findOne').mockResolvedValue(mockOutbox);

        const res = await supertest(app)
            .post(`/api/admin/batches/${batchId}/review`)
            .send({ action: 'Accept' });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Batch commitment retry initiated.');
        expect(mockOutbox.status).toBe('PENDING');
        expect(mockOutbox.retryCount).toBe(0);
        expect(mockOutbox.save).toHaveBeenCalled();
    });
});
