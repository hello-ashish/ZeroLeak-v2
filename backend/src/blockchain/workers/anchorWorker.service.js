import { getLedgerHeight, getLedgerHistory } from "../private/privateBlockchain.service.js";
import { submitPolygonAnchor, getPolygonAnchor } from "../public/anchor.service.js";
import crypto from "crypto";
import { buildMerkleRoot } from "../../Services/merkle.service.js";
import { AnchorState } from "../../models/anchorState.models.js";

const ANCHOR_INTERVAL_MS = process.env.ANCHOR_INTERVAL ? parseInt(process.env.ANCHOR_INTERVAL, 10) : 60000;
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function processAnchor() {
    try {
        const lockExpiry = new Date(Date.now() - LOCK_TIMEOUT_MS);
        const lockId = `worker-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;

        // Acquire lock
        const state = await AnchorState.findOneAndUpdate(
            {
                _id: "global",
                $or: [{ lockedAt: null }, { lockedAt: { $lt: lockExpiry } }]
            },
            {
                $set: { lockedAt: new Date(), lockedBy: lockId },
                $setOnInsert: { sequence: 0, lastAnchoredHeight: -1 }
            },
            { upsert: true, new: true }
        );

        // If state is null, another worker holds the lock
        if (!state || state.lockedBy !== lockId) {
            return;
        }

        try {
            // Initialize from chain if we have no prior state
            if (state.lastAnchoredHeight === -1) {
                console.log("[AnchorWorker] Uninitialized local state. Syncing from Polygon...");
                const chainState = await getPolygonAnchor();
                if (chainState && chainState.sequence > 0) {
                    state.sequence = chainState.sequence;
                    state.lastAnchoredHeight = chainState.height;
                    console.log(`[AnchorWorker] Synced from chain: sequence=${state.sequence}, height=${state.lastAnchoredHeight}`);
                }
            }

            const currentHeight = await getLedgerHeight();
            if (currentHeight <= state.lastAnchoredHeight) {
                // Nothing new to anchor
                return;
            }

            console.log(`[AnchorWorker] New blocks detected. Creating checkpoint for height ${currentHeight}.`);
            
            // Fetch blocks up to current height
            const blocks = await getLedgerHistory(100);
            
            // Calculate ledger hash
            const ledgerHash = crypto.createHash("sha256").update(JSON.stringify(blocks)).digest("hex");
            
            // Calculate commitment root for this batch
            const hashes = blocks.map(b => b.canonicalHash || crypto.createHash("sha256").update(JSON.stringify(b)).digest("hex"));
            const root = buildMerkleRoot(hashes) || "0x0";

            const nextSequence = state.sequence + 1;
            
            try {
                const txHash = await submitPolygonAnchor(nextSequence, currentHeight, ledgerHash, root);
                console.log(`[AnchorWorker] Checkpoint anchored successfully. TxHash: ${txHash}`);
                
                // Update local state on success
                state.sequence = nextSequence;
                state.lastAnchoredHeight = currentHeight;
            } catch (err) {
                console.error("[AnchorWorker] Chain submission failed:", err.message);
                // If it failed because of sequence mismatch (e.g., chain is ahead), 
                // we can force a sync on the next run by resetting lastAnchoredHeight if needed, 
                // but for now, we just leave it so it can retry with the same sequence.
                // We do not advance local sequence.
                
                // Fallback catch for sequence error - force a sync next tick
                if (err.message && err.message.includes('sequence')) {
                    console.log("[AnchorWorker] Sequence error detected. Forcing chain sync on next run.");
                    state.lastAnchoredHeight = -1; 
                }
            }
        } finally {
            // Release lock
            await AnchorState.updateOne(
                { _id: "global", lockedBy: lockId },
                { $set: { lockedAt: null, lockedBy: null, sequence: state.sequence, lastAnchoredHeight: state.lastAnchoredHeight } }
            );
        }

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
