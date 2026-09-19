import mongoose from "mongoose";

const integrityOutboxSchema = new mongoose.Schema({
    eventId: { type: String, required: true, unique: true, index: true },
    objectType: { type: String, required: true }, // e.g. "Exam", "Result", "Incident", "AuditBatch"
    objectId: { type: String, required: true },
    objectVersion: { type: Number, default: 1 },
    commitmentType: {
        type: String,
        enum: ["EXAM_VERSION", "QUESTION_BATCH", "SUBMISSION", "RESULT", "GRADE_REVISION", "CRITICAL_INTEGRITY_INCIDENT", "AUDIT_BATCH"],
        required: true,
    },
    canonicalHash: { type: String, required: true }, // The hash that will be committed
    payload: { type: mongoose.Schema.Types.Mixed, required: true }, // The canonical data
    status: {
        type: String,
        enum: ["PENDING", "SUBMITTED", "CONFIRMED", "FAILED"],
        default: "PENDING",
        index: true,
    },
    retryCount: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    processedAt: { type: Date, default: null },
    privateTransactionId: { type: String, default: null }, // ID returned by Fabric
}, { timestamps: true });

export const IntegrityOutbox = mongoose.model("IntegrityOutbox", integrityOutboxSchema);
