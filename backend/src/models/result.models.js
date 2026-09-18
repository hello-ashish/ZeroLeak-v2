import mongoose from "mongoose"

const resultSchema = new mongoose.Schema({

    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exam",
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    totalQuestions: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Completed", "Terminated"],
        default: "Completed"
    },
    isTerminated: {
        type: Boolean,
        default: false
    },
    terminationReason: {
        type: String,
        default: null
    },
    // Set by Admin to authorize a fresh exam attempt after unblocking.
    // The old terminated record is preserved for audit; eligibility checks skip it.
    resetByAdmin: {
        type: Boolean,
        default: false
    },
    resetByAdminAt: {
        type: Date,
        default: null
    }
}, { timestamps: true })

export const Result = mongoose.model("Result", resultSchema)