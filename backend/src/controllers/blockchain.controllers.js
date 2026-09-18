import { BlockchainBlock } from "../models/blockchain.models.js";
import { getLedger, getBlockByIndex, verifyBlockchain } from "../Services/blockchain.service.js";

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
