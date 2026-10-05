import mongoose, { Schema } from "mongoose"

const anomalySchema = new Schema({
    rule: { type: String, required: true, // e.g., "Multiple failed logins", "Grade modified after completion" },
    description: { type: String, required: true },
    severity: { type: String, enum: ["Critical", "High", "Medium", "Low", "Informational"], default: "Medium" },
    category: { type: String, enum: ["Authentication", "Exam Integrity", "Grade Changes", "Content Changes", "Batch Operations", "Permission Events"], default: "System" },
    status: { type: String, enum: ["Open", "Under Review", "Resolved", "Dismissed"], default: "Open" },
    actor: {
        type: String, // email/id of the person who triggered the anomaly
    },
    targetType: {
        type: String, // e.g., "Exam", "Result", "Student"
    },
    targetId: {
        type: String,
    },
    relatedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: "AuditLog" }],
    notes: [{
        text: String,
        addedBy: String, // auditor email
        addedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true })

// Indexes for high-performance querying
anomalySchema.index({ targetId: 1, rule: 1 });
anomalySchema.index({ status: 1 });
anomalySchema.index({ createdAt: -1 });
anomalySchema.index({ actor: 1, rule: 1 });

export const Anomaly = mongoose.model("Anomaly", anomalySchema)
