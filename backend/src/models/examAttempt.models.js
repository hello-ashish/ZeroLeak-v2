import mongoose from "mongoose";

const examAttemptSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    exam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    startedAt: {
        type: Date,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    submittedAt: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['InProgress', 'Submitted', 'Terminated', 'Expired'],
        default: 'InProgress'
    },
    violationCount: {
        type: Number,
        default: 0
    },
    resetByAdmin: {
        type: Boolean,
        default: false
    },
    resetByAdminAt: {
        type: Date,
        default: null
    },
    terminationReason: {
        type: String,
        default: null
    }
}, { timestamps: true });

examAttemptSchema.index({ student: 1, exam: 1 });

export const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);
