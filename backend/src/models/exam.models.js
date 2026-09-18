import mongoose from "mongoose";

const examSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    durationMinutes: {
        type: Number,
        required: true,
        default: 60,
    },
    passingPercentage: {
        type: Number,
        default: 50, // % required to pass
    },
    totalMarks: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ["Draft", "Scheduled", "Live", "Completed", "Archived"],
        default: "Draft",
    },
    scheduledAt: {
        type: Date,
        default: null,
    },
    endsAt: {
        type: Date,
        default: null,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true,
    },
    questions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
    }],
    questionMerkleRoot: {
        type: String,
        default: null,
    },
    blockchainBlockIndex: {
        type: Number,
        default: null,
    },
    blockchainBlockHash: {
        type: String,
        default: null,
    },
}, { timestamps: true })

export const Exam = mongoose.model('Exam', examSchema)