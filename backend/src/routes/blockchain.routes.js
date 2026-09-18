import { Router } from "express";
import {
    getBlockchainLedger,
    getBlockchainStatus,
    verifyBlockchainLedger,
    getBlockchainBlock,
} from "../controllers/blockchain.controllers.js";
import { verifyAdminJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/ledger", verifyAdminJWT, getBlockchainLedger);
router.get("/status", verifyAdminJWT, getBlockchainStatus);
router.get("/verify", verifyAdminJWT, verifyBlockchainLedger);
router.get("/blocks/:blockIndex", verifyAdminJWT, getBlockchainBlock);

export default router;
