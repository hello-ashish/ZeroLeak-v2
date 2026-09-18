import { BlockchainBlock } from "../models/blockchain.models.js";
import { getLedger, getBlockByIndex, verifyBlockchain, createAuditBatchCommitment } from "../Services/blockchain.service.js";

export const getBlockchainLedger = async (req, res) => {
    try {
        const { limit = 100, skip = 0 } = req.query;
        const ledger = await getLedger({ limit, skip });
        return res.status(200).json({ message: "Blockchain ledger fetched successfully", ...ledger });
    } catch (error) {
        console.error("Blockchain ledger error:", error);
        return res.status(500).json({ message: "Unable to fetch blockchain ledger" });
    }
};

export const getBlockchainStatus = async (req, res) => {
    try {
        const verification = await verifyBlockchain();
        const latest = await BlockchainBlock.findOne().sort({ blockIndex: -1 }).lean();
        return res.status(200).json({
            connected: true,
            network: "ZEROLEAK-PERMISSIONED-V1",
            blockCount: verification.blockCount,
            latestBlock: latest?.blockIndex ?? null,
            latestHash: latest?.hash ?? null,
            integrity: verification.valid,
            verification,
        });
    } catch (error) {
        console.error("Blockchain status error:", error);
        return res.status(500).json({ message: "Blockchain ledger is unavailable" });
    }
};

export const verifyBlockchainLedger = async (req, res) => {
    try {
        const verification = await verifyBlockchain();
        return res.status(verification.valid ? 200 : 409).json({ message: verification.reason, verification });
    } catch (error) {
        console.error("Blockchain verification error:", error);
        return res.status(500).json({ message: "Unable to verify blockchain ledger" });
    }
};

export const getBlockchainBlock = async (req, res) => {
    try {
        const block = await getBlockByIndex(req.params.blockIndex);
        if (!block) return res.status(404).json({ message: "Block not found" });
        return res.status(200).json({ block });
    } catch (error) {
        return res.status(400).json({ message: "Invalid block index" });
    }
};

export const commitAuditBatch = async (req, res) => {
    try {
        const block = await createAuditBatchCommitment();
        if (!block) {
            return res.status(200).json({ message: "No uncommitted audit events found", block: null });
        }
        return res.status(201).json({ message: "Audit batch committed successfully", block });
    } catch (error) {
        console.error("Audit batch commitment error:", error);
        return res.status(500).json({ message: "Failed to commit audit batch" });
    }
};

export const verifyEntityCommitment = async (req, res) => {
    try {
        const { entityId } = req.params;
        const block = await BlockchainBlock.findOne({ entityId }).lean();
        
        if (!block) {
            return res.status(404).json({ 
                verified: false, 
                message: "No cryptographic commitment found for this entity.", 
                block: null 
            });
        }
        
        // We do a quick hash check on the block itself
        // Full ledger verification is done via /verify
        const { sha256, canonicalize } = await import("../Services/blockchain.service.js");
        
        // Temporarily recalculate blockHash to verify integrity of the block record itself
        const payload = canonicalize({
            blockIndex: block.blockIndex,
            blockType: block.blockType,
            entityId: block.entityId,
            entityLabel: block.entityLabel || "",
            merkleRoot: block.merkleRoot || null,
            commitmentHash: block.commitmentHash,
            previousHash: block.previousHash,
            actorId: block.actorId || null,
            actorRole: block.actorRole || null,
            metadata: block.metadata || {},
            timestamp: new Date(block.timestamp).toISOString(),
        });
        const expectedHash = sha256(JSON.stringify(payload));
        
        const isBlockValid = block.hash === expectedHash;

        return res.status(200).json({
            verified: isBlockValid,
            message: isBlockValid ? "Cryptographic commitment verified successfully." : "Block hash mismatch detected!",
            block
        });
    } catch (error) {
        console.error("Entity verification error:", error);
        return res.status(500).json({ message: "Error verifying entity commitment." });
    }
};
