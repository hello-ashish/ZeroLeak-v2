import mongoose, { Schema } from "mongoose"

// Sub-schema for questions in draft state
const draftQuestionSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    options: {
        type: [String],
        required: true
    },
    correctAnswer: {
        type: String,
        required: true
    },
    difficultyLevel: {
        type: String,
        enum: ["easy", "medium", "hard"],
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    topic: {
        type: String,
        required: true
    },
    correctAnswerIndex: {
        type: Number,
        required: true
    }
}, { timestamps: true})

const batchSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    subject: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"Professor",
        required: true
    },
    questions: [draftQuestionSchema],
    status: {
        type: String,
        enum: ["Draft", "Submitted", "Accepted", "Rejected", "MarkForReview"],
        default: "Draft"
    },
    adminMessage: {
        type: String,
        default: ""
    },
    openedByAdmin: {
        type: Boolean,
        default: false
    }
}, { timestamps: true})

export const Batch = mongoose.model("Batch", batchSchema)