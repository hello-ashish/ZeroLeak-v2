import mongoose from "mongoose"

const auditLogSchema = new mongoose.Schema({
    actor: {
        type: String,
        required: true // "admin@zeroleak.com"
    },
    actorRole: {
        type: String,
        enum: ["Admin", "Professor", "System"],
        default: "Admin"
    },
    action: {
        type: String,
        required: true // "BATCH_APPROVED", "PROFESSOR_CREATED"
    },
    targetType: {
        type: String, // "Batch", "Professor", "Student", "Exam"
    },
    targetId: {
        type: String, // The _id of the affected document
    },
    targetLabel: {
        type: String, // Batch title, professor name
    },
    details: {
        type: String,
    },
    status: {
        type: String,
        enum: ["success", "failure"],
        default: "success"
    }
}, { timestamps: true })

export const AuditLog = mongoose.model("AuditLog", auditLogSchema)
