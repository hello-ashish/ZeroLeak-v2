import mongoose, { Schema } from "mongoose";

/**
 * ProctoringAIEvent — durable record of every AI-generated detection signal.
 *
 * These are SIGNALS, not verdicts.  Human review converts signals into
 * confirmed incidents through the review flow.
 *
 * State:
 *   - process-local: nothing
 *   - Redis: proctor:ai:<sessionId>  (live suspicion score, expires with TTL)
 *   - Mongo:  this collection (permanent audit trail)
 */
const proctoringAIEventSchema = new Schema(
    {
        sessionId: {
            type: Schema.Types.ObjectId,
            ref: "ProctoringSession",
            required: true,
            index: true
        },
        examId: {
            type: Schema.Types.ObjectId,
            ref: "Exam",
            required: true,
            index: true
        },
        studentId: {
            type: Schema.Types.ObjectId,
            ref: "Student",
            required: true,
            index: true
        },
        // Normalized detection type (from configured detector set)
        type: {
            type: String,
            required: true,
            enum: [
                "FACE_MISSING",
                "MULTIPLE_FACES",
                "UNUSUAL_FACE_POSITION",
                "PHONE_LIKE_OBJECT",
                "SCREEN_ANOMALY",
                "UNEXPECTED_CONTENT",
                "UNUSUAL_AUDIO",
                "MULTIPLE_VOICES",
                // Behavioural signals (from the student client)
                "TAB_SWITCH",
                "WINDOW_BLUR",
                "FULLSCREEN_EXIT",
                "SCREEN_SHARE_STOPPED",
                "RAPID_ANSWER_CHANGE",
                "COPY_PASTE_DETECTED"
            ]
        },
        // Raw model confidence [0, 1]
        confidence: {
            type: Number,
            required: true,
            min: 0,
            max: 1
        },
        // Weighted contribution to session suspicion score [0, 100]
        scoreContribution: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        // Identifies which model/detector produced this signal
        modelVersion: {
            type: String,
            default: "mock-v0"
        },
        // Arbitrary detector-specific payload (no raw frames stored here)
        metadata: {
            type: Schema.Types.Mixed,
            default: {}
        },
        // Admin review state
        reviewStatus: {
            type: String,
            enum: ["PENDING", "REVIEWED", "DISMISSED"],
            default: "PENDING",
            index: true
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            default: null
        },
        reviewedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

// Compound indexes for the most common dashboard queries
proctoringAIEventSchema.index({ sessionId: 1, createdAt: -1 });
proctoringAIEventSchema.index({ examId: 1, createdAt: -1 });
proctoringAIEventSchema.index({ studentId: 1, createdAt: -1 });
proctoringAIEventSchema.index({ reviewStatus: 1, createdAt: -1 });
proctoringAIEventSchema.index({ type: 1, createdAt: -1 });

export const ProctoringAIEvent = mongoose.model("ProctoringAIEvent", proctoringAIEventSchema);
