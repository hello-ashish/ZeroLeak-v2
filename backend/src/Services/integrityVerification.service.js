import * as fabricService from './fabric.service.js';
import { IntegrityOutbox } from '../models/integrityOutbox.models.js';
import { Result } from '../models/result.models.js';
import { Question } from '../models/question.models.js';
import { Exam } from '../models/exam.models.js';

// Verify a Result
export async function verifyResult(resultId) {
    const result = await Result.findById(resultId).lean();
    if (!result) {
        return _notFound('Result', resultId);
    }

    const entityId = result._id.toString();
    const version = 1;
    const commitmentId = fabricService.buildCommitmentId('Result', entityId, version);

    const canonical = {
        _id: entityId,
        student: result.student?.toString(),
        exam: result.exam?.toString(),
        score: result.score,
        totalQuestions: result.totalQuestions,
        status: result.status,
        isTerminated: result.isTerminated,
        assignedQuestions: (result.assignedQuestions || []).map(q => q?.toString()).sort(),
        createdAt: result.createdAt instanceof Date ? result.createdAt.toISOString() : result.createdAt,
    };

    const computedHash = fabricService.computeDataHash(canonical);

    return _verifyAgainstLedger({
        entityId,
        entityType: 'Result',
        commitmentId,
        computedHash,
    });
}


// Verify a Question
export async function verifyQuestion(questionId) {
    const question = await Question.findById(questionId).lean();
    if (!question) {
        return _notFound('Question', questionId);
    }

    const entityId = question._id.toString();
    const version = 1;
    const commitmentId = fabricService.buildCommitmentId('Question', entityId, version);

    // For questions, the contentHash is already the canonical SHA-256 computed on creation
    const computedHash = question.contentHash;

    return _verifyAgainstLedger({
        entityId,
        entityType: 'Question',
        commitmentId,
        computedHash,
    });
}


// Verify an Exam
export async function verifyExam(examId) {
    const exam = await Exam.findById(examId).lean();
    if (!exam) {
        return _notFound('Exam', examId);
    }

    const entityId = exam._id.toString();
    const version = 1;
    const commitmentId = fabricService.buildCommitmentId('Exam', entityId, version);

    const canonical = {
        _id: entityId,
        title: exam.title,
        subject: exam.subject,
        mode: exam.mode,
        questionMerkleRoot: exam.questionMerkleRoot || '',
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        scheduledAt: exam.scheduledAt instanceof Date ? exam.scheduledAt.toISOString() : exam.scheduledAt,
        createdAt: exam.createdAt instanceof Date ? exam.createdAt.toISOString() : exam.createdAt,
        questionCount: (exam.questions || []).length,
    };

    const computedHash = fabricService.computeDataHash(canonical);

    return _verifyAgainstLedger({
        entityId,
        entityType: 'Exam',
        commitmentId,
        computedHash,
    });
}


// Verify a Security Event (generic — event must be in outbox)
export async function verifySecurityEvent(eventId) {
    const outboxRecord = await IntegrityOutbox.findOne({
        entityType: 'SecurityEvent',
        entityId: eventId,
        status: 'CONFIRMED',
    }).lean();

    if (!outboxRecord) {
        return {
            valid: false,
            entityId: eventId,
            entityType: 'SecurityEvent',
            reason: 'COMMITMENT_NOT_FOUND',
            message: 'No confirmed Fabric commitment found for this security event.',
            verifiedAt: new Date().toISOString(),
        };
    }

    return _verifyAgainstLedger({
        entityId: eventId,
        entityType: 'SecurityEvent',
        commitmentId: outboxRecord.commitmentId,
        computedHash: outboxRecord.dataHash,
    });
}


// Get outbox status for an entity (useful for admin/auditor UI)
export async function getOutboxStatus(entityType, entityId) {
    const records = await IntegrityOutbox.find({ entityType, entityId })
        .sort({ version: 1 })
        .lean();

    return records.map(r => ({
        commitmentId: r.commitmentId,
        status: r.status,
        version: r.version,
        dataHash: r.dataHash,
        fabricTxId: r.fabricTxId,
        fabricBlockTimestamp: r.fabricBlockTimestamp,
        fabricHeight: r.fabricHeight,
        attemptCount: r.attemptCount,
        lastError: r.lastError,
        confirmedAt: r.confirmedAt,
        createdAt: r.createdAt,
    }));
}


// Internal helpers
async function _verifyAgainstLedger({ entityId, entityType, commitmentId, computedHash }) {
    const fabricEnabled = process.env.FABRIC_ENABLED === 'true';

    if (!fabricEnabled) {
        return {
            valid: null,
            entityId,
            entityType,
            commitmentId,
            computedHash,
            ledgerHash: null,
            reason: 'FABRIC_DISABLED',
            message: 'Fabric integration is disabled. Enable FABRIC_ENABLED=true to verify against the ledger.',
            verifiedAt: new Date().toISOString(),
        };
    }

    try {
        const fabricResult = await fabricService.verifyCommitment(commitmentId, computedHash);

        return {
            valid: fabricResult.valid,
            entityId,
            entityType,
            commitmentId,
            computedHash,
            ledgerHash: fabricResult.storedHash,
            ledgerVersion: fabricResult.version,
            txId: fabricResult.txId,
            blockTimestamp: fabricResult.blockTimestamp,
            reason: fabricResult.reason,
            verifiedAt: new Date().toISOString(),
        };

    } catch (err) {
        const code = err.code || 'FABRIC_ERROR';

        if (code === 'COMMITMENT_NOT_FOUND') {
            // Check if it's pending in the outbox
            const outboxRecord = await IntegrityOutbox.findOne({ commitmentId }).lean();
            const outboxStatus = outboxRecord?.status || 'NOT_IN_OUTBOX';

            return {
                valid: false,
                entityId,
                entityType,
                commitmentId,
                computedHash,
                ledgerHash: null,
                reason: 'COMMITMENT_NOT_FOUND',
                outboxStatus,
                message: `No commitment found on ledger. Outbox status: ${outboxStatus}`,
                verifiedAt: new Date().toISOString(),
            };
        }

        return {
            valid: false,
            entityId,
            entityType,
            commitmentId,
            computedHash,
            ledgerHash: null,
            reason: code,
            message: `Fabric verification error: ${err.message}`,
            verifiedAt: new Date().toISOString(),
        };
    }
}

function _notFound(entityType, entityId) {
    return {
        valid: false,
        entityId,
        entityType,
        reason: 'ENTITY_NOT_FOUND',
        message: `${entityType} with id '${entityId}' was not found in MongoDB.`,
        verifiedAt: new Date().toISOString(),
    };
}
