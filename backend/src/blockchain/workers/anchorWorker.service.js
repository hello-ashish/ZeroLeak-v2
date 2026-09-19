import { getLedgerHeight, getLedgerHistory } from "../private/privateBlockchain.service.js";
import { submitPolygonAnchor } from "../public/anchor.service.js";
import crypto from "crypto";
import { buildMerkleRoot } from "../../Services/merkle.service.js";

const ANCHOR_INTERVAL_MS = process.env.ANCHOR_INTERVAL ? parseInt(process.env.ANCHOR_INTERVAL, 10) : 60000; // 1 min default
let lastAnchoredHeight = -1;
let sequence = 0;

export async function processAnchor() {
    try {
        const currentHeight = await getLedgerHeight();
        if (currentHeight <= lastAnchoredHeight) {
            // Nothing new to anchor
            return;
        }

        console.log(`[AnchorWorker] New blocks detected. Creating checkpoint for height ${currentHeight}.`);
        
        // Fetch all blocks up to current height to create a state hash and merkle root
        // In a real huge production system, you'd incrementally compute this, but we'll fetch limit
        const blocks = await getLedgerHistory(100);
        
        // Calculate ledger hash
        const ledgerHash = crypto.createHash("sha256").update(JSON.stringify(blocks)).digest("hex");
        
        // Calculate commitment root for this batch
        const hashes = blocks.map(b => b.canonicalHash || crypto.createHash("sha256").update(JSON.stringify(b)).digest("hex"));
        const root = buildMerkleRoot(hashes) || "0x0";

        sequence += 1;
        
        const txHash = await submitPolygonAnchor(sequence, currentHeight, ledgerHash, root);
        console.log(`[AnchorWorker] Checkpoint anchored successfully. TxHash: ${txHash}`);
        
        lastAnchoredHeight = currentHeight;

    } catch (error) {
        console.error("[AnchorWorker] Failed during anchoring process:", error);
    }
}

let anchorInterval = null;

export function startAnchorWorker() {
    if (anchorInterval) return;
    console.log("[AnchorWorker] Started.");
    anchorInterval = setInterval(processAnchor, ANCHOR_INTERVAL_MS);
}
