import { Router } from "express";
import {
    getBlockchainLedger,
    getBlockchainStatus,
    verifyBlockchainLedger,
    getBlockchainBlock,
    commitAuditBatch,
    verifyEntityCommitment,
    getPublicAnchorStatus
} from "../controllers/blockchain.controllers.js";
import { verifyAdminOrAuditorJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/ledger", verifyAdminOrAuditorJWT, getBlockchainLedger);
router.get("/status", verifyAdminOrAuditorJWT, getBlockchainStatus);
router.get("/verify", verifyAdminOrAuditorJWT, verifyBlockchainLedger);
router.get("/blocks/:blockIndex", verifyAdminOrAuditorJWT, getBlockchainBlock);
router.post("/audit-batch", verifyAdminOrAuditorJWT, commitAuditBatch);
router.get("/verify-entity/:entityId", verifyAdminOrAuditorJWT, verifyEntityCommitment);
router.get("/anchor", verifyAdminOrAuditorJWT, getPublicAnchorStatus);

export default router;
