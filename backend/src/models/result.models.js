import mongoose from "mongoose"

const resultSchema = new mongoose.Schema({
    attemptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ExamAttempt",
        required: true
    },
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
        default: 0
    },
    totalQuestions: {
        type: Number,
        default: 0
    },
    commitmentId: {
        type: String,
        default: null
    },
    commitmentHash: {
        type: String,
        default: null
    }
}, { timestamps: true })

export const Result = mongoose.model("Result", resultSchema)