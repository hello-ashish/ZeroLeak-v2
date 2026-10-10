import * as verificationService from '../Services/integrityVerification.service.js';
import * as fabricService from '../Services/fabric.service.js';
import { IntegrityOutbox } from '../models/integrityOutbox.models.js';

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

function _isValidObjectId(id) {
    return /^[a-f0-9]{24}$/.test(id);
}

// ─── GET /api/integrity/alerts ───────────────────────────────────────────────
export const getIntegrityAlerts = async (req, res) => {
    try {
        const { Notification } = await import('../models/notification.models.js');
        const userId = req.admin?._id || req.auditor?._id;
        const alerts = await Notification.find({
            userId,
            title: '⚠️ DB TAMPERING DETECTED'
        }).sort({ createdAt: -1 }).limit(10).lean();
        
        res.json({ alerts });
    } catch (e) {
        console.error("[INTEGRITY] Error getting alerts:", e.message);
        res.status(500).json({ message: "Failed to fetch integrity alerts" });
    }
};
