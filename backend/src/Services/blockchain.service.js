import crypto from "crypto";
import { BlockchainBlock } from "../models/blockchain.models.js";

const GENESIS_PREVIOUS_HASH = "0".repeat(64);

function canonicalize(value) {
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

function sha256(value) {
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
    if (!["BATCH_COMMITMENT", "EXAM_COMMITMENT"].includes(blockType)) {
        throw new Error("Invalid blockchain block type.");
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

    try {
        return await BlockchainBlock.create(data);
    } catch (error) {
        // A unique blockIndex collision means another request appended first.
        // Retry once against the new chain tip rather than creating a fork.
        if (error?.code === 11000) {
            const retryLatest = await BlockchainBlock.findOne().sort({ blockIndex: -1 }).lean();
            data.blockIndex = retryLatest.blockIndex + 1;
            data.previousHash = retryLatest.hash;
            data.hash = blockHash(data);
            return BlockchainBlock.create(data);
        }
        throw error;
    }
}

export async function verifyBlockchain() {
    const blocks = await BlockchainBlock.find({}).sort({ blockIndex: 1 }).lean();

    if (blocks.length === 0) {
        return { valid: false, blockCount: 0, invalidBlock: null, reason: "Ledger is empty." };
    }

    const genesis = blocks[0];
    if (genesis.blockIndex !== 0 || genesis.previousHash !== GENESIS_PREVIOUS_HASH) {
        return { valid: false, blockCount: blocks.length, invalidBlock: genesis.blockIndex, reason: "Invalid genesis block." };
    }

    for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];
        const expectedHash = blockHash(block);

        if (block.hash !== expectedHash) {
            return {
                valid: false,
                blockCount: blocks.length,
                invalidBlock: block.blockIndex,
                reason: "Block hash mismatch.",
            };
        }

        if (i > 0) {
            const previous = blocks[i - 1];
            if (block.blockIndex !== previous.blockIndex + 1) {
                return {
                    valid: false,
                    blockCount: blocks.length,
                    invalidBlock: block.blockIndex,
                    reason: "Block sequence is broken.",
                };
            }
            if (block.previousHash !== previous.hash) {
                return {
                    valid: false,
                    blockCount: blocks.length,
                    invalidBlock: block.blockIndex,
                    reason: "Previous-hash link is broken.",
                };
            }
        }
    }

    return {
        valid: true,
        blockCount: blocks.length,
        latestBlock: blocks[blocks.length - 1].blockIndex,
        latestHash: blocks[blocks.length - 1].hash,
        reason: "All blocks and hash links are valid.",
    };
}

export async function getLedger({ limit = 100, skip = 0 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const safeSkip = Math.max(Number(skip) || 0, 0);
    const [blocks, total, verification] = await Promise.all([
        BlockchainBlock.find({}).sort({ blockIndex: -1 }).skip(safeSkip).limit(safeLimit).lean(),
        BlockchainBlock.countDocuments(),
        verifyBlockchain(),
    ]);

    return { blocks, total, verification };
}

export async function getBlockByIndex(blockIndex) {
    return BlockchainBlock.findOne({ blockIndex: Number(blockIndex) }).lean();
}
