import * as verificationService from '../Services/integrityVerification.service.js';
import * as fabricService from '../Services/fabric.service.js';
import { IntegrityOutbox } from '../models/integrityOutbox.models.js';
import { Notification } from '../models/notification.models.js';
import { AuditLog } from '../models/auditlog.models.js';

export const getFabricStatus = async (req, res) => {
    try {
        const status = fabricService.getFabricStatus();
        return res.status(200).json(status);
    } catch (err) {
        console.error('[INTEGRITY] Error fetching Fabric status:', err.message);
        return res.status(500).json({ message: 'Failed to retrieve Fabric status.', error: err.message });
    }
};

export const verifyResult = async (req, res) => {
    try {
        const { resultId } = req.params;
        if (!_isValidObjectId(resultId)) {
            return res.status(400).json({ message: 'Invalid resultId format.' });
        }

        const result = await verificationService.verifyResult(resultId);
        return res.status(200).json(result);
    } catch (err) {
        console.error('[INTEGRITY] Error verifying result:', err.message);
        return res.status(500).json({ message: 'Integrity verification failed.', error: err.message });
    }
};

export const verifyBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        if (!_isValidObjectId(batchId)) {
            return res.status(400).json({ message: 'Invalid batchId format.' });
        }

        const result = await verificationService.verifyBatch(batchId);
        return res.status(200).json(result);
    } catch (err) {
        console.error('[INTEGRITY] Error verifying batch:', err.message);
        return res.status(500).json({ message: 'Integrity verification failed.', error: err.message });
    }
};

export const verifyExam = async (req, res) => {
    try {
        const { examId } = req.params;
        if (!_isValidObjectId(examId)) {
            return res.status(400).json({ message: 'Invalid examId format.' });
        }

        const result = await verificationService.verifyExam(examId);
        return res.status(200).json(result);
    } catch (err) {
        console.error('[INTEGRITY] Error verifying exam:', err.message);
        return res.status(500).json({ message: 'Integrity verification failed.', error: err.message });
    }
};

export const verifySecurityEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        if (!_isValidObjectId(eventId)) {
            return res.status(400).json({ message: 'Invalid eventId format.' });
        }

        const result = await verificationService.verifySecurityEvent(eventId);
        return res.status(200).json(result);
    } catch (err) {
        console.error('[INTEGRITY] Error verifying security event:', err.message);
        return res.status(500).json({ message: 'Integrity verification failed.', error: err.message });
    }
};

export const getCommitment = async (req, res) => {
    try {
        const { commitmentId } = req.params;
        const commitment = await fabricService.getCommitment(commitmentId);
        return res.status(200).json(commitment);
    } catch (err) {
        if (err.code === 'FABRIC_DISABLED') {
            return res.status(503).json({ message: 'Fabric integration is disabled.', code: 'FABRIC_DISABLED' });
        }
        if (err.code === 'COMMITMENT_NOT_FOUND') {
            return res.status(404).json({ message: `Commitment not found: ${req.params.commitmentId}`, code: 'COMMITMENT_NOT_FOUND' });
        }
        console.error('[INTEGRITY] Error fetching commitment:', err.message);
        return res.status(500).json({ message: 'Failed to fetch commitment.', error: err.message });
    }
};

export const getCommitmentHistory = async (req, res) => {
    try {
        const { commitmentId } = req.params;
        const history = await fabricService.getCommitmentHistory(commitmentId);
        return res.status(200).json({ history });
    } catch (err) {
        if (err.code === 'FABRIC_DISABLED') {
            return res.status(503).json({ message: 'Fabric integration is disabled.', code: 'FABRIC_DISABLED' });
        }
        console.error('[INTEGRITY] Error fetching commitment history:', err.message);
        return res.status(500).json({ message: 'Failed to fetch commitment history.', error: err.message });
    }
};

export const getRecentCommitments = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
        const commitments = await fabricService.getRecentCommitments(limit);
        return res.status(200).json({ commitments });
    } catch (err) {
        if (err.code === 'FABRIC_DISABLED') {
            return res.status(200).json({ commitments: [], fabricEnabled: false });
        }
        console.error('[INTEGRITY] Error fetching recent commitments:', err.message);
        return res.status(500).json({ message: 'Failed to fetch recent commitments.', error: err.message });
    }
};

export const getOutboxStatus = async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const validTypes = ['Result', 'Batch', 'Exam', 'SecurityEvent'];
        if (!validTypes.includes(entityType)) {
            return res.status(400).json({ message: `Invalid entityType. Must be one of: ${validTypes.join(', ')}` });
        }
        if (!_isValidObjectId(entityId)) {
            return res.status(400).json({ message: 'Invalid entityId format.' });
        }

        const records = await verificationService.getOutboxStatus(entityType, entityId);
        return res.status(200).json({ outbox: records });
    } catch (err) {
        console.error('[INTEGRITY] Error fetching outbox status:', err.message);
        return res.status(500).json({ message: 'Failed to fetch outbox status.', error: err.message });
    }
};

export const getPendingOutbox = async (req, res) => {
    try {
        const records = await IntegrityOutbox.find({
            status: { $in: ['PENDING', 'PROCESSING', 'FAILED'] },
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        return res.status(200).json({ records });
    } catch (err) {
        console.error('[INTEGRITY] Error fetching pending outbox:', err.message);
        return res.status(500).json({ message: 'Failed to fetch pending outbox records.', error: err.message });
    }
};

export const getLedgerHeight = async (req, res) => {
    try {
        const result = await fabricService.getLedgerHeight();
        return res.status(200).json(result);
    } catch (err) {
        if (err.code === 'FABRIC_DISABLED') {
            return res.status(200).json({ height: 0, fabricEnabled: false });
        }
        console.error('[INTEGRITY] Error fetching ledger height:', err.message);
        return res.status(500).json({ message: 'Failed to fetch ledger height.', error: err.message });
    }
};

export const getFabricBlocks = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '100', 10), 100);
        const data = await fabricService.getFabricBlocks(limit);
        return res.status(200).json(data);
    } catch (err) {
        if (err.code === 'FABRIC_DISABLED') {
            return res.status(200).json({ blocks: [], height: 0, fabricEnabled: false });
        }
        console.error('[INTEGRITY] Error fetching fabric blocks:', err.message);
        return res.status(500).json({ message: 'Failed to fetch fabric blocks.', error: err.message });
    }
};

function _isValidObjectId(id) {
    return /^[a-f0-9]{24}$/.test(id);
}

// ─── GET /api/integrity/alerts ───────────────────────────────────────────────
export const getIntegrityAlerts = async (req, res) => {
    try {
        const userId = req.admin?._id || req.auditor?._id;
        const userRole = req.admin ? 'Admin' : 'Auditor';

        // Query for tampering notifications matching this user, role, or title
        const alerts = await Notification.find({
            $or: [
                { userId, title: '⚠️ DB TAMPERING DETECTED' },
                { userRole, title: '⚠️ DB TAMPERING DETECTED' },
                { title: '⚠️ DB TAMPERING DETECTED' }
            ]
        }).sort({ createdAt: -1 }).limit(25).lean();

        // Deduplicate by message & incident time bucket (10s) so broadcast alerts appear once
        const seen = new Set();
        const uniqueAlerts = [];
        for (const a of alerts) {
            const timeBucket = Math.floor(new Date(a.createdAt).getTime() / 10000);
            const key = `${a.message}-${timeBucket}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueAlerts.push(a);
            }
        }
        
        res.json({ alerts: uniqueAlerts });
    } catch (e) {
        console.error("[INTEGRITY] Error getting alerts:", e.message);
        res.status(500).json({ message: "Failed to fetch integrity alerts" });
    }
};

// ─── POST /api/integrity/verify-ledger ───────────────────────────────────────
// Bulk verification: fetches all CONFIRMED outbox records and re-verifies each
// entity's recomputed MongoDB hash against the immutable Fabric commitment.
export const verifyAllCommitments = async (req, res) => {
    try {
        const fabricEnabled = process.env.FABRIC_ENABLED === 'true';
        if (!fabricEnabled) {
            return res.status(200).json({
                fabricEnabled: false,
                summary: { total: 0, verified: 0, tampered: 0, skipped: 0 },
                results: [],
                verifiedAt: new Date().toISOString(),
                message: 'Fabric is disabled. Enable FABRIC_ENABLED=true to run ledger verification.',
            });
        }

        // Fetch all confirmed commitments from the outbox (strictly excluding legacy mock transactions)
        const confirmedRecords = await IntegrityOutbox.find({
            status: 'CONFIRMED',
            privateTransactionId: { $exists: false },
            commitmentId: { $exists: true, $ne: null }
        })
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        // When multiple versions exist for the same entity, verify the latest version against live data
        const latestByEntity = new Map();
        for (const record of confirmedRecords) {
            const key = `${record.entityType}:${record.entityId}`;
            const existing = latestByEntity.get(key);
            if (!existing || (record.version || 1) > (existing.version || 1)) {
                latestByEntity.set(key, record);
            }
        }
        const activeRecords = Array.from(latestByEntity.values());

        const results = [];
        let verified = 0;
        let tampered = 0;
        let skipped = 0;

        for (const record of activeRecords) {
            const { entityType, entityId, commitmentId, version } = record;
            let verResult = null;

            try {
                if (entityType === 'Result') {
                    verResult = await verificationService.verifyResult(entityId, version);
                } else if (entityType === 'Exam') {
                    verResult = await verificationService.verifyExam(entityId, version);
                } else if (entityType === 'Batch') {
                    verResult = await verificationService.verifyBatch(entityId, version);
                } else if (entityType === 'SecurityEvent') {
                    verResult = await verificationService.verifySecurityEvent(entityId);
                } else {
                    skipped++;
                    results.push({
                        commitmentId,
                        entityType,
                        entityId,
                        status: 'SKIPPED',
                        reason: 'UNSUPPORTED_ENTITY_TYPE',
                        message: `Verification not supported for entity type: ${entityType}`,
                    });
                    continue;
                }

                const isTampered = verResult?.valid === false && verResult?.reason === 'HASH_MISMATCH';
                const isVerified = verResult?.valid === true;

                if (isVerified) verified++;
                else if (isTampered) {
                    tampered++;
                    try {
                        await AuditLog.create({
                            actor: req.admin?.email || req.auditor?.email || "System",
                            actorRole: req.admin ? "Admin" : req.auditor ? "Auditor" : "System",
                            action: "LEDGER_TAMPERING_DETECTED",
                            targetType: entityType,
                            targetId: String(entityId),
                            targetLabel: commitmentId,
                            details: `Ledger verification failed: hash mismatch on ${entityType} (${entityId}). Live hash: ${verResult?.computedHash}, Ledger: ${verResult?.ledgerHash}`,
                            status: "failure"
                        });
                    } catch (logErr) {
                        console.error("[INTEGRITY] Failed to write AuditLog for tampering:", logErr.message);
                    }
                } else skipped++;

                results.push({
                    commitmentId,
                    entityType,
                    entityId,
                    fabricTxId: record.fabricTxId,
                    fabricBlockTimestamp: record.fabricBlockTimestamp,
                    status: isVerified ? 'VERIFIED' : isTampered ? 'TAMPERED' : 'UNVERIFIABLE',
                    reason: verResult?.reason,
                    computedHash: verResult?.computedHash,
                    ledgerHash: verResult?.ledgerHash,
                    message: verResult?.message,
                    verifiedAt: verResult?.verifiedAt,
                });
            } catch (err) {
                skipped++;
                results.push({
                    commitmentId,
                    entityType,
                    entityId,
                    status: 'ERROR',
                    reason: 'VERIFICATION_EXCEPTION',
                    message: err.message,
                });
            }
        }

        return res.status(200).json({
            fabricEnabled: true,
            summary: {
                total: activeRecords.length,
                verified,
                tampered,
                skipped,
            },
            results,
            verifiedAt: new Date().toISOString(),
        });
    } catch (e) {
        console.error('[INTEGRITY] Error running bulk ledger verification:', e.message);
        return res.status(500).json({ message: 'Bulk ledger verification failed.', error: e.message });
    }
};

// ─── POST /api/integrity/reconcile ───────────────────────────────────────────
// Manually triggers a self-healing reconciliation cycle to discover and enqueue
// any uncommitted or missing database records into the IntegrityOutbox.
export const triggerReconciliation = async (req, res) => {
    try {
        const { reconcileUncommittedEntities } = await import('../Services/integrityOutbox.service.js');
        const stats = await reconcileUncommittedEntities();
        return res.status(200).json({
            message: 'Integrity outbox reconciliation completed successfully.',
            stats,
            reconciledAt: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[INTEGRITY] Error triggering reconciliation:', err.message);
        return res.status(500).json({ message: 'Failed to run reconciliation.', error: err.message });
    }
};
