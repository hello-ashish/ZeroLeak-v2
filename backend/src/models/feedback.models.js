import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'role'
    },
    role: {
        type: String,
        required: true,
        enum: ["Student", "Professor", "Admin", "Auditor"]
    },
    category: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    priority: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        default: "Low"
    },
    status: {
        type: String,
        enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
        default: "OPEN"
    },
    adminResponse: {
        type: String,
        default: null
    },
    context: {
        examId: { type: String, default: null },
        page: { type: String, default: null }
    }
}, { timestamps: true });

export const Feedback = mongoose.model("Feedback", feedbackSchema);
