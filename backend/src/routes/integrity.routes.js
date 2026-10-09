// =============================================================================
// ZeroLeak — integrity.routes.js
// =============================================================================
// Routes for Fabric integrity verification.
//
// Authorization:
//   - Admin (isSupport=false): full access via verifyAdminJWT
//   - Auditor: full access via verifyAuditorJWT
//   - Support: BLOCKED (verifyAdminJWT rejects support accounts)
//   - Professor/Student: NO access (not mounted on their routers)
//
// Fabric status is public within the admin/auditor context (no additional
// authorization needed beyond the existing JWT middlewares).
// =============================================================================

import { Router } from 'express';
import {
    getFabricStatus,
    verifyResult,
    verifyBatch,
    verifyExam,
    verifySecurityEvent,
    getCommitment,
    getCommitmentHistory,
    getRecentCommitments,
    getOutboxStatus,
    getPendingOutbox,
    getLedgerHeight,
} from '../controllers/integrity.controllers.js';
import { verifyAdminOrAuditorJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// All integrity routes require Admin OR Auditor JWT
// Support accounts are blocked by verifyAdminOrAuditorJWT (Admin.isSupport check)
router.use(verifyAdminOrAuditorJWT);

// Network status
router.get('/fabric-status', getFabricStatus);
router.get('/ledger-height', getLedgerHeight);
router.get('/recent', getRecentCommitments);

// Entity verification
router.get('/result/:resultId', verifyResult);
router.get('/batch/:batchId', verifyBatch);
router.get('/exam/:examId', verifyExam);
router.get('/event/:eventId', verifySecurityEvent);

// Raw commitment lookup
router.get('/commitment/:commitmentId', getCommitment);
router.get('/commitment/:commitmentId/history', getCommitmentHistory);

// Outbox monitoring
router.get('/outbox/pending', getPendingOutbox);
router.get('/outbox/:entityType/:entityId', getOutboxStatus);

export default router;
