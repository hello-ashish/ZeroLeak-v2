import mongoose from "mongoose";

const blockchainBlockSchema = new mongoose.Schema(
    {
        blockIndex: { type: Number, required: true, unique: true, index: true },
        blockType: {
            type: String,
            enum: ["GENESIS", "BATCH_COMMITMENT", "EXAM_COMMITMENT", "RESULT_COMMITMENT", "INCIDENT_COMMITMENT", "AUDIT_BATCH_COMMITMENT"],
            required: true,
        },
        entityId: { type: String, required: true, index: true },
        entityLabel: { type: String, default: "" },
        merkleRoot: { type: String, default: null },
        commitmentHash: { type: String, required: true },
        previousHash: { type: String, required: true },
        hash: { type: String, required: true, unique: true, index: true },
        actorId: { type: String, default: null },
        actorRole: { type: String, default: null },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        timestamp: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true }
);

// There are deliberately no update/delete APIs for ledger blocks.
blockchainBlockSchema.index({ commitmentHash: 1 }, { unique: true });

export const BlockchainBlock = mongoose.model("BlockchainBlock", blockchainBlockSchema);
