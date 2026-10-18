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
 * @param {string} opts.eventType     - RESULT_COMMITMENT | EXAM_COMMITMENT | SECURITY_EVENT | BATCH_COMMITMENT
 * @param {string} opts.entityType    - Result | Exam | SecurityEvent | Batch
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
    // Remove the early return so that records are durably queued in MongoDB 
    // even if Fabric is disabled. This allows a controlled backfill later.

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
        const baseFilter = {
            $or: [
                { status: 'PENDING' },
                {
                    status: 'PROCESSING',
                    leaseExpiresAt: { $lt: now }, // Lease expired — safe to reclaim
                },
            ],
            $expr: { $lt: ['$attemptCount', '$maxAttempts'] },
            entityType: { $ne: 'Question' },
        };

        const updateDoc = {
            $set: {
                status: 'PROCESSING',
                processingWorker: WORKER_ID,
                leaseExpiresAt: leaseExpiry,
            },
            $inc: { attemptCount: 1 },
        };

        // Priority 1: Structural commitments (SecurityEvent, Batch, Exam)
        let claimed = await IntegrityOutbox.findOneAndUpdate(
            {
                ...baseFilter,
                entityType: { $in: ['SecurityEvent', 'Batch', 'Exam'] },
            },
            updateDoc,
            {
                sort: { createdAt: 1 },
                returnDocument: 'after',
            }
        );

        // Priority 2: Results (process newest first so active exam submissions aren't blocked by bulk backlog)
        if (!claimed) {
            claimed = await IntegrityOutbox.findOneAndUpdate(
                baseFilter,
                updateDoc,
                {
                    sort: { createdAt: -1 },
                    returnDocument: 'after',
                }
            );
        }

        if (!claimed) break;
        claims.push(claimed);
    }

    if (claims.length === 0) return;

    console.info(`[OUTBOX] Worker ${WORKER_ID} claimed ${claims.length} record(s).`);

    for (const record of claims) {
        await _processRecord(record);
    }
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
        assignedQuestions: (result.assignedQuestions || []).map(q => (q && q._id ? q._id.toString() : q?.toString() || q)).sort(),
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

export async function enqueueSecurityEventCommitment(securityEvent, version = 1, previousHash = '') {
    const entityId = (securityEvent._id || securityEvent.id).toString();
    const commitmentId = fabricService.buildCommitmentId('SecurityEvent', entityId, version);

    const canonical = {
        _id: entityId,
        actor: securityEvent.actor || '',
        actorRole: securityEvent.actorRole || '',
        action: securityEvent.action || securityEvent.eventType || '',
        targetType: securityEvent.targetType || '',
        targetId: String(securityEvent.targetId || ''),
        status: securityEvent.status || '',
        timestamp: securityEvent.createdAt instanceof Date ? securityEvent.createdAt.toISOString() : (securityEvent.createdAt || securityEvent.timestamp || new Date().toISOString()),
    };

    const dataHash = securityEvent.dataHash || fabricService.computeDataHash(canonical);

    return enqueueCommitment({
        commitmentId,
        eventType: 'SECURITY_EVENT',
        entityType: 'SecurityEvent',
        entityId,
        dataHash,
        previousCommitmentHash: previousHash,
        version,
    });
}

export async function enqueueExamCommitment(exam, version = 1, previousHash = '') {

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

export async function enqueueBatchCommitment(batch, version = 1, previousHash = '') {
    const entityId = batch._id.toString();
    const commitmentId = fabricService.buildCommitmentId('Batch', entityId, version);

    // The dataHash for a batch is simply its Merkle Root which encapsulates all questions
    return enqueueCommitment({
        commitmentId,
        eventType: 'BATCH_COMMITMENT',
        entityType: 'Batch',
        entityId,
        dataHash: batch.merkleRoot,
        previousCommitmentHash: previousHash,
        version,
    });
}

// ─── Reconciliation Sweeper (Option 2: Self-Healing Outbox) ─────────────────
let _reconcilerInterval = null;
const RECONCILE_INTERVAL_MS = 30 * 60 * 1000; // Run every 30 minutes

/**
 * Scans MongoDB for any committed/finalized entities that are missing an outbox
 * entry or need re-anchoring, guaranteeing At-Least-Once Delivery.
 */
export async function reconcileUncommittedEntities() {
    console.info('[RECONCILER] Starting integrity outbox reconciliation cycle...');
    const stats = {
        batchesReconciled: 0,
        resultsReconciled: 0,
        examsReconciled: 0,
        stuckProcessingReset: 0,
        permanentlyFailed: 0,
    };

    try {
        // 1. Reset any stale PROCESSING records whose lease expired
        const now = new Date();
        const resetResult = await IntegrityOutbox.updateMany(
            {
                status: 'PROCESSING',
                leaseExpiresAt: { $lt: now },
            },
            {
                $set: {
                    status: 'PENDING',
                    processingWorker: null,
                    leaseExpiresAt: null,
                },
            }
        );
        stats.stuckProcessingReset = resetResult.modifiedCount || 0;

        // 2. Count permanently failed records
        stats.permanentlyFailed = await IntegrityOutbox.countDocuments({ status: 'FAILED' });

        // 3. Reconcile Accepted Batches
        const { Batch } = await import('../models/batch.models.js');
        const acceptedBatches = await Batch.find({
            status: 'Accept',
            merkleRoot: { $exists: true, $ne: '' },
        }).select('_id merkleRoot title').lean();

        const existingBatchCommitments = new Set(
            (await IntegrityOutbox.find({ entityType: 'Batch' }).select('commitmentId').lean())
                .map(r => r.commitmentId)
        );

        for (const batch of acceptedBatches) {
            const commitmentId = fabricService.buildCommitmentId('Batch', batch._id.toString(), 1);
            if (!existingBatchCommitments.has(commitmentId)) {
                console.info(`[RECONCILER] Re-enqueuing missing batch commitment: ${batch._id} ("${batch.title}")`);
                await enqueueBatchCommitment(batch);
                existingBatchCommitments.add(commitmentId);
                stats.batchesReconciled++;
            }
        }

        // 4. Reconcile Completed Results (recent only to prevent queue starvation)
        const { Result } = await import('../models/result.models.js');
        const completedResults = await Result.find({ status: 'Completed' })
            .sort({ createdAt: -1 })
            .limit(25)
            .select('_id student exam score totalQuestions status isTerminated assignedQuestions createdAt')
            .lean();

        const existingResultCommitments = new Set(
            (await IntegrityOutbox.find({ entityType: 'Result' }).select('commitmentId').lean())
                .map(r => r.commitmentId)
        );

        for (const res of completedResults) {
            const commitmentId = fabricService.buildCommitmentId('Result', res._id.toString(), 1);
            if (!existingResultCommitments.has(commitmentId)) {
                console.info(`[RECONCILER] Re-enqueuing missing result commitment: ${res._id}`);
                await enqueueResultCommitment(res);
                existingResultCommitments.add(commitmentId);
                stats.resultsReconciled++;
            }
        }

        // 5. Reconcile Exams
        const { Exam } = await import('../models/exam.models.js');
        const exams = await Exam.find({})
            .select('_id title subject mode questionMerkleRoot durationMinutes totalMarks scheduledAt createdAt questions')
            .lean();

        const existingExamCommitments = new Set(
            (await IntegrityOutbox.find({ entityType: 'Exam' }).select('commitmentId').lean())
                .map(r => r.commitmentId)
        );

        for (const exam of exams) {
            const commitmentId = fabricService.buildCommitmentId('Exam', exam._id.toString(), 1);
            if (!existingExamCommitments.has(commitmentId)) {
                console.info(`[RECONCILER] Re-enqueuing missing exam commitment: ${exam._id} ("${exam.title}")`);
                await enqueueExamCommitment(exam, 1, '');
                existingExamCommitments.add(commitmentId);
                stats.examsReconciled++;
            }
        }

        console.info(`[RECONCILER] Cycle completed: batches=${stats.batchesReconciled}, results=${stats.resultsReconciled}, exams=${stats.examsReconciled}, resetStuck=${stats.stuckProcessingReset}, failed=${stats.permanentlyFailed}`);
    } catch (err) {
        console.error('[RECONCILER] Error during reconciliation:', err.message);
    }

    return stats;
}

/**
 * Starts the periodic reconciler background timer.
 */
export function startIntegrityReconciler() {
    if (_reconcilerInterval) return;

    console.info(`[RECONCILER] Initializing background reconciler (interval=${RECONCILE_INTERVAL_MS / 60000}m)`);

    // Run first reconciliation 5 seconds after startup
    setTimeout(() => {
        reconcileUncommittedEntities().catch(err =>
            console.error('[RECONCILER] Initial run error:', err.message)
        );
    }, 5000);

    _reconcilerInterval = setInterval(async () => {
        try {
            await reconcileUncommittedEntities();
        } catch (err) {
            console.error('[RECONCILER] Interval error:', err.message);
        }
    }, RECONCILE_INTERVAL_MS);
}
