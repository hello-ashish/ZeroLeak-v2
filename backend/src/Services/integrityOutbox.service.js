import { IntegrityOutbox } from '../models/integrityOutbox.models.js';
import * as fabricService from './fabric.service.js';
import os from 'os';

const WORKER_ID = `${os.hostname()}-${process.pid}`;
const POLL_INTERVAL_MS = 15_000;        // Poll every 15 seconds
const LEASE_DURATION_MS = 120_000;      // 2-minute lease per record
const BATCH_SIZE = 10;                   // Process up to 10 records per cycle

let _workerInterval = null;


// Outbox record creation (called by application code)
/**
 * @param {Object} opts
 * @param {string} opts.commitmentId  - Deterministic Fabric commitment ID
 * @param {string} opts.eventType     - RESULT_COMMITMENT | QUESTION_COMMITMENT | EXAM_COMMITMENT | SECURITY_EVENT
 * @param {string} opts.entityType    - Result | Question | Exam | SecurityEvent
 * @param {string} opts.entityId      - MongoDB ObjectId hex string
 * @param {string} opts.dataHash      - SHA-256 hex
 * @param {string} [opts.previousCommitmentHash] - SHA-256 or ''
 * @param {number} [opts.version]     - monotonic version >= 1
 */
export async function enqueueCommitment({
    commitmentId,
    eventType,
    entityType,
    entityId,
    dataHash,
    previousCommitmentHash = '',
    version = 1,
}) {
    const cfg = { enabled: process.env.FABRIC_ENABLED === 'true' };
    if (!cfg.enabled) {
        return null;
    }

    try {
        const record = await IntegrityOutbox.create({
            commitmentId,
            eventType,
            entityType,
            entityId,
            dataHash,
            previousCommitmentHash,
            version,
            eventTimestamp: new Date().toISOString(),
            status: 'PENDING',
        });
        console.info(`[OUTBOX] Enqueued commitment id=${commitmentId} entityType=${entityType} entityId=${entityId}`);
        return record;
    } catch (err) {
        if (err.code === 11000) {
            // Duplicate — already enqueued, safe to ignore
            console.warn(`[OUTBOX] Commitment ${commitmentId} already in outbox — skipping duplicate enqueue.`);
            return null;
        }
        console.error(`[OUTBOX] Failed to enqueue commitment ${commitmentId}: ${err.message}`);
        throw err;
    }
}


// Worker
export function startIntegrityOutboxWorker() {
    if (process.env.FABRIC_ENABLED !== 'true') {
        console.info('[OUTBOX] FABRIC_ENABLED=false — outbox worker not started.');
        return;
    }

    if (_workerInterval) return; // Already running

    console.info(`[OUTBOX] Starting IntegrityOutbox worker (workerId=${WORKER_ID}, poll=${POLL_INTERVAL_MS}ms)`);

    _workerInterval = setInterval(async () => {
        try {
            await _processBatch();
        } catch (err) {
            console.error(`[OUTBOX] Worker error: ${err.message}`);
        }
    }, POLL_INTERVAL_MS);

    // Run once immediately on startup
    setTimeout(() => _processBatch().catch(e => console.error('[OUTBOX] Initial batch error:', e.message)), 2000);
}

async function _processBatch() {
    const now = new Date();
    const leaseExpiry = new Date(now.getTime() + LEASE_DURATION_MS);

    const claims = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
        const claimed = await IntegrityOutbox.findOneAndUpdate(
            {
                $or: [
                    { status: 'PENDING' },
                    {
                        status: 'PROCESSING',
                        leaseExpiresAt: { $lt: now }, // Lease expired — safe to reclaim
                    },
                ],
                $expr: { $lt: ['$attemptCount', '$maxAttempts'] },
            },
            {
                $set: {
                    status: 'PROCESSING',
                    processingWorker: WORKER_ID,
                    leaseExpiresAt: leaseExpiry,
                },
                $inc: { attemptCount: 1 },
            },
            {
                sort: { createdAt: 1 },
                returnDocument: 'after',
            }
        );

        if (!claimed) break;
        claims.push(claimed);
    }

    if (claims.length === 0) return;

    console.info(`[OUTBOX] Worker ${WORKER_ID} claimed ${claims.length} record(s).`);

    await Promise.allSettled(claims.map(record => _processRecord(record)));
}

async function _processRecord(record) {
    const { commitmentId, eventType, entityType, entityId, dataHash, previousCommitmentHash, version, eventTimestamp } = record;

    try {
        const result = await fabricService.createCommitment({
            id: commitmentId,
            eventType,
            entityType,
            entityId,
            dataHash,
            previousCommitmentHash,
            version,
            timestamp: eventTimestamp,
        });

        if (result.status === 'CONFIRMED' || result.status === 'DUPLICATE') {
            await IntegrityOutbox.findByIdAndUpdate(record._id, {
                $set: {
                    status: 'CONFIRMED',
                    fabricTxId: result.txId || null,
                    fabricBlockTimestamp: result.blockTimestamp || null,
                    fabricHeight: result.height || null,
                    lastError: null,
                    lastErrorCode: null,
                    confirmedAt: new Date(),
                    processingWorker: null,
                    leaseExpiresAt: null,
                },
            });
            console.info(`[OUTBOX] CONFIRMED commitmentId=${commitmentId} txId=${result.txId}`);
        } else if (result.status === 'FABRIC_DISABLED') {
            await IntegrityOutbox.findByIdAndUpdate(record._id, {
                $set: { status: 'PENDING', processingWorker: null, leaseExpiresAt: null },
                $inc: { attemptCount: -1 }, // Don't count this as a failed attempt
            });
        }

    } catch (err) {
        const errCode = err.code || 'UNKNOWN';
        const errMsg = err.message || 'Unknown error';

        console.error(`[OUTBOX] FAILED commitmentId=${commitmentId} code=${errCode} error=${errMsg}`);

        const updatedRecord = await IntegrityOutbox.findById(record._id);
        const shouldPermanentlyFail = updatedRecord && updatedRecord.attemptCount >= updatedRecord.maxAttempts;

        await IntegrityOutbox.findByIdAndUpdate(record._id, {
            $set: {
                status: shouldPermanentlyFail ? 'FAILED' : 'PENDING',
                lastError: errMsg.substring(0, 500), // Cap to prevent huge error strings
                lastErrorCode: errCode,
                processingWorker: null,
                leaseExpiresAt: null,
            },
        });
    }
}


// Application-level helpers
export async function enqueueResultCommitment(result) {
    if (process.env.FABRIC_ENABLED !== 'true') return null;

    const entityId = result._id.toString();
    const version = 1;

    const canonical = {
        _id: entityId,
        student: result.student?.toString() || result.student,
        exam: result.exam?.toString() || result.exam,
        score: result.score,
        totalQuestions: result.totalQuestions,
        status: result.status,
        isTerminated: result.isTerminated,
        assignedQuestions: (result.assignedQuestions || []).map(q => q?.toString() || q).sort(),
        createdAt: result.createdAt instanceof Date ? result.createdAt.toISOString() : result.createdAt,
    };

    const dataHash = fabricService.computeDataHash(canonical);
    const commitmentId = fabricService.buildCommitmentId('Result', entityId, version);

    return enqueueCommitment({
        commitmentId,
        eventType: 'RESULT_COMMITMENT',
        entityType: 'Result',
        entityId,
        dataHash,
        previousCommitmentHash: '',
        version,
    });
}

export async function enqueueQuestionCommitment(question, version = 1, previousHash = '') {
    if (process.env.FABRIC_ENABLED !== 'true') return null;

    const entityId = question._id.toString();
    const commitmentId = fabricService.buildCommitmentId('Question', entityId, version);

    return enqueueCommitment({
        commitmentId,
        eventType: 'QUESTION_COMMITMENT',
        entityType: 'Question',
        entityId,
        dataHash: question.contentHash, // Already computed SHA-256
        previousCommitmentHash: previousHash,
        version,
    });
}

export async function enqueueExamCommitment(exam, version = 1, previousHash = '') {
    if (process.env.FABRIC_ENABLED !== 'true') return null;

    const entityId = exam._id.toString();
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

    const dataHash = fabricService.computeDataHash(canonical);

    return enqueueCommitment({
        commitmentId,
        eventType: 'EXAM_COMMITMENT',
        entityType: 'Exam',
        entityId,
        dataHash,
        previousCommitmentHash: previousHash,
        version,
    });
}
