import crypto from "crypto";
import { BlockchainBlock } from "../models/blockchain.models.js";
import { AuditLog } from "../models/auditlog.models.js";
import { buildMerkleRoot } from "./merkle.service.js";

const GENESIS_PREVIOUS_HASH = "0".repeat(64);

export function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
        return Object.keys(value)
            .sort()
            .reduce((out, key) => {
                out[key] = canonicalize(value[key]);
                return out;
            }, {});
    }
    return value;
}

export function sha256(value) {
    return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function blockHash(block) {
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

    return sha256(JSON.stringify(payload));
}

export async function ensureGenesisBlock() {
    const existing = await BlockchainBlock.findOne({ blockIndex: 0 }).lean();
    if (existing) return existing;

    const timestamp = new Date("2026-01-01T00:00:00.000Z");
    const commitmentHash = sha256("ZEROLEAK-GENESIS");
    const data = {
        blockIndex: 0,
        blockType: "GENESIS",
        entityId: "GENESIS",
        entityLabel: "ZeroLeak Genesis Block",
        merkleRoot: null,
        commitmentHash,
        previousHash: GENESIS_PREVIOUS_HASH,
        actorId: null,
        actorRole: "SYSTEM",
        metadata: { network: "ZEROLEAK-PERMISSIONED-V1" },
        timestamp,
    };

    data.hash = blockHash(data);

    try {
        return await BlockchainBlock.create(data);
    } catch (error) {
        // Another server process may have created the genesis block first.
        if (error?.code === 11000) {
            return BlockchainBlock.findOne({ blockIndex: 0 }).lean();
        }
        throw error;
    }
}

export async function appendCommitment({
    blockType,
    entityId,
    entityLabel,
    merkleRoot,
    actorId,
    actorRole,
    metadata = {},
}) {
    if (!["BATCH_COMMITMENT", "EXAM_COMMITMENT", "RESULT_COMMITMENT", "INCIDENT_COMMITMENT", "AUDIT_BATCH_COMMITMENT"].includes(blockType)) {
        throw new Error("Invalid blockchain block type: " + blockType);
    }
    if (!entityId) throw new Error("Blockchain entityId is required.");
    if (merkleRoot && !/^[a-fA-F0-9]{64}$/.test(merkleRoot)) {
        throw new Error("Blockchain Merkle root must be a valid SHA-256 hash.");
    }

    await ensureGenesisBlock();

    const latest = await BlockchainBlock.findOne().sort({ blockIndex: -1 }).lean();
    const timestamp = new Date();
    const safeMetadata = canonicalize(metadata);
    const commitmentHash = sha256(
        JSON.stringify(canonicalize({
            blockType,
            entityId: String(entityId),
            merkleRoot: merkleRoot || null,
            metadata: safeMetadata,
        }))
    );

    const data = {
        blockIndex: latest.blockIndex + 1,
        blockType,
        entityId: String(entityId),
        entityLabel: entityLabel || "",
        merkleRoot: merkleRoot || null,
        commitmentHash,
        previousHash: latest.hash,
        actorId: actorId ? String(actorId) : null,
        actorRole: actorRole || null,
        metadata: safeMetadata,
        timestamp,
    };

    data.hash = blockHash(data);

    let retries = 0;
    const MAX_RETRIES = 5;

    while (retries < MAX_RETRIES) {
        try {
            return await BlockchainBlock.create(data);
        } catch (error) {
            if (error?.code === 11000) {
                retries++;
                if (retries >= MAX_RETRIES) {
                    throw new Error("Failed to append block after multiple concurrent retries.");
                }
                // Fetch the new latest block and adjust data
                const retryLatest = await BlockchainBlock.findOne().sort({ blockIndex: -1 }).lean();
                data.blockIndex = retryLatest.blockIndex + 1;
                data.previousHash = retryLatest.hash;
                data.hash = blockHash(data);
                
                // Add a tiny random delay to avoid exact lockstepping
                await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
            } else {
                throw error;
            }
        }
    }
}

export async function createAuditBatchCommitment() {
    // Find uncommitted audit logs
    const logs = await AuditLog.find({ isCommitted: false }).sort({ createdAt: 1 });
    if (logs.length === 0) return null;

    // Build hashes
    const hashes = logs.map(log => {
        const payload = canonicalize({
            logId: String(log._id),
            actor: log.actor,
            action: log.action,
            targetId: log.targetId,
            timestamp: log.createdAt
        });
        return sha256(JSON.stringify(payload));
    });

    const merkleRoot = buildMerkleRoot(hashes);

    // Create commitment
    const block = await appendCommitment({
        blockType: "AUDIT_BATCH_COMMITMENT",
        entityId: `AUDIT_BATCH_${Date.now()}`,
        entityLabel: `Audit Batch (${logs.length} events)`,
        merkleRoot: merkleRoot,
        actorId: "SYSTEM",
        actorRole: "System",
        metadata: {
            eventCount: logs.length,
            firstEventId: String(logs[0]._id),
            lastEventId: String(logs[logs.length - 1]._id)
        }
    });

    // Mark as committed
    const logIds = logs.map(l => l._id);
    await AuditLog.updateMany({ _id: { $in: logIds } }, { $set: { isCommitted: true } });

    return block;
}

export async function verifyBlockchain() {
    const cursor = BlockchainBlock.find({}).sort({ blockIndex: 1 }).cursor();
    
    let blockCount = 0;
    let previousBlock = null;

    for await (const block of cursor) {
        if (blockCount === 0) {
            if (block.blockIndex !== 0 || block.previousHash !== GENESIS_PREVIOUS_HASH) {
                return { valid: false, blockCount: 1, invalidBlock: block.blockIndex, reason: "Invalid genesis block." };
            }
        }

        const expectedHash = blockHash(block);
        if (block.hash !== expectedHash) {
            return {
                valid: false,
                blockCount: blockCount + 1,
                invalidBlock: block.blockIndex,
                reason: "Block hash mismatch.",
            };
        }

        if (previousBlock) {
            if (block.blockIndex !== previousBlock.blockIndex + 1) {
                return {
                    valid: false,
                    blockCount: blockCount + 1,
                    invalidBlock: block.blockIndex,
                    reason: "Block sequence is broken.",
                };
            }
            if (block.previousHash !== previousBlock.hash) {
                return {
                    valid: false,
                    blockCount: blockCount + 1,
                    invalidBlock: block.blockIndex,
                    reason: "Previous-hash link is broken.",
                };
            }
        }

        previousBlock = block;
        blockCount++;
    }

    if (blockCount === 0) {
        return { valid: false, blockCount: 0, invalidBlock: null, reason: "Ledger is empty." };
    }

    return {
        valid: true,
        blockCount: blockCount,
        latestBlock: previousBlock.blockIndex,
        latestHash: previousBlock.hash,
        reason: "All blocks and hash links are valid.",
    };
}

export async function getLedger({ limit = 100, skip = 0 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const safeSkip = Math.max(Number(skip) || 0, 0);
    const [blocks, total] = await Promise.all([
        BlockchainBlock.find({}).sort({ blockIndex: -1 }).skip(safeSkip).limit(safeLimit).lean(),
        BlockchainBlock.countDocuments(),
    ]);

    // Disconnected verifyBlockchain() to prevent OOM on dashboard load
    return { blocks, total, verification: { valid: null, reason: "Verification must be triggered manually." } };
}

export async function getBlockByIndex(blockIndex) {
    return BlockchainBlock.findOne({ blockIndex: Number(blockIndex) }).lean();
}
