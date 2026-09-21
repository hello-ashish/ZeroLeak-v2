import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { Question } from '../models/question.models.js';
import { Batch } from '../models/batch.models.js';
import { Exam } from '../models/exam.models.js';
import { AuditLog } from '../models/auditlog.models.js';
import { deleteBatch } from '../controllers/admin.controllers.js';
import { hashQuestionContent } from '../Services/crypto.service.js';

describe('Cross-Batch Question Deletion Idempotency', () => {
    let mockReq, mockRes;
    const batchIdA = new mongoose.Types.ObjectId();
    const batchIdB = new mongoose.Types.ObjectId();
    const questionId = new mongoose.Types.ObjectId();
    
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockReq = {
            params: { batchId: batchIdA.toString() },
            admin: { email: 'admin@test.com' }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.spyOn(AuditLog, 'create').mockResolvedValue(true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should NOT delete question if another batch claims it', async () => {
        const sensitiveContent = {
            title: "Test Q",
            options: ["A", "B", "C", "D"],
            correctAnswer: "A",
            correctAnswerIndex: 0
        };
        const contentHash = hashQuestionContent(sensitiveContent);

        const mockBatchA = {
            _id: batchIdA,
            status: 'Accepted',
            questions: [sensitiveContent],
            isDeletedByAdmin: false,
            save: jest.fn().mockResolvedValue(true)
        };

        const mockOrphanedQuestions = []; // Since Batch B still holds the batchId

        const batchFindByIdSpy = jest.spyOn(Batch, 'findById').mockResolvedValue(mockBatchA);
        const questionUpdateManySpy = jest.spyOn(Question, 'updateMany').mockResolvedValue({ modifiedCount: 1 });
        const questionFindSpy = jest.spyOn(Question, 'find').mockReturnValue({
            select: jest.fn().mockResolvedValue(mockOrphanedQuestions)
        });
        const questionDeleteManySpy = jest.spyOn(Question, 'deleteMany');

        await deleteBatch(mockReq, mockRes);

        expect(batchFindByIdSpy).toHaveBeenCalledWith(batchIdA.toString());
        
        expect(questionUpdateManySpy).toHaveBeenCalledWith(
            { contentHash: { $in: [contentHash] } },
            { $pull: { batchIds: batchIdA.toString() } }
        );

        // Ensure deleteMany is NEVER called because the question is NOT orphaned
        expect(questionDeleteManySpy).not.toHaveBeenCalled();
        expect(mockBatchA.isDeletedByAdmin).toBe(true);
        expect(mockBatchA.save).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should delete question if NO other batch or exam claims it', async () => {
        const sensitiveContent = {
            title: "Test Q2",
            options: ["A", "B", "C", "D"],
            correctAnswer: "B",
            correctAnswerIndex: 1
        };
        const contentHash = hashQuestionContent(sensitiveContent);

        const mockBatchA = {
            _id: batchIdA,
            status: 'Accepted',
            questions: [sensitiveContent],
            isDeletedByAdmin: false,
            save: jest.fn().mockResolvedValue(true)
        };

        // It is orphaned because $size is 0
        const mockOrphanedQuestions = [{ _id: questionId }];
        const mockExams = []; // No exams use this question

        jest.spyOn(Batch, 'findById').mockResolvedValue(mockBatchA);
        jest.spyOn(Question, 'updateMany').mockResolvedValue({ modifiedCount: 1 });
        jest.spyOn(Question, 'find').mockReturnValue({
            select: jest.fn().mockResolvedValue(mockOrphanedQuestions)
        });
        
        jest.spyOn(Exam, 'find').mockReturnValue({
            select: jest.fn().mockResolvedValue(mockExams)
        });

        const questionDeleteManySpy = jest.spyOn(Question, 'deleteMany').mockResolvedValue({ deletedCount: 1 });

        await deleteBatch(mockReq, mockRes);

        // Verify that the orphaned question is explicitly deleted
        expect(questionDeleteManySpy).toHaveBeenCalledWith({
            _id: { $in: [questionId] }
        });
    });

    it('should NOT delete orphaned question if an EXAM still claims it', async () => {
        const sensitiveContent = {
            title: "Test Q3",
            options: ["A", "B", "C", "D"],
            correctAnswer: "C",
            correctAnswerIndex: 2
        };
        const contentHash = hashQuestionContent(sensitiveContent);

        const mockBatchA = {
            _id: batchIdA,
            status: 'Accepted',
            questions: [sensitiveContent],
            isDeletedByAdmin: false,
            save: jest.fn().mockResolvedValue(true)
        };

        const mockOrphanedQuestions = [{ _id: questionId }];
        // An exam is still actively using this question
        const mockExams = [{ questions: [questionId] }];

        jest.spyOn(Batch, 'findById').mockResolvedValue(mockBatchA);
        jest.spyOn(Question, 'updateMany').mockResolvedValue({ modifiedCount: 1 });
        jest.spyOn(Question, 'find').mockReturnValue({
            select: jest.fn().mockResolvedValue(mockOrphanedQuestions)
        });
        
        jest.spyOn(Exam, 'find').mockReturnValue({
            select: jest.fn().mockResolvedValue(mockExams)
        });

        const questionDeleteManySpy = jest.spyOn(Question, 'deleteMany');

        await deleteBatch(mockReq, mockRes);

        // Ensure deleteMany is NEVER called because the Exam prevented the deletion
        expect(questionDeleteManySpy).not.toHaveBeenCalled();
    });
});
