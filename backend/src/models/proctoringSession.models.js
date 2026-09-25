import mongoose, { Schema } from "mongoose";

const proctoringSessionSchema = new Schema(
    {
        examId: {
            type: Schema.Types.ObjectId,
            ref: "Exam",
            required: true,
        },
        studentId: {
            type: Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        status: {
            type: String,
            enum: ["INITIALIZING", "ACTIVE", "PAUSED", "ENDED", "DISCONNECTED"],
            default: "INITIALIZING",
        },
        cameraStatus: {
            type: String,
            enum: ["CONNECTED", "DISCONNECTED", "PERMISSION_DENIED", "NOT_FOUND", "DEVICE_ERROR", "ENDED", "UNKNOWN"],
            default: "UNKNOWN",
        },
        microphoneStatus: {
            type: String,
            enum: ["CONNECTED", "DISCONNECTED", "PERMISSION_DENIED", "NOT_FOUND", "DEVICE_ERROR", "ENDED", "UNKNOWN"],
            default: "UNKNOWN",
        },
        connectionStatus: {
            type: String,
            enum: ["ONLINE", "UNSTABLE", "OFFLINE"],
            default: "OFFLINE",
        },
        fullscreenStatus: {
            type: String,
            enum: ["ACTIVE", "INACTIVE", "UNKNOWN"],
            default: "UNKNOWN",
        },
        lastHeartbeat: {
            type: Date,
            default: null,
        },
        tabSwitchCount: {
            type: Number,
            default: 0,
        },
        windowBlurCount: {
            type: Number,
            default: 0,
        },
        incidentCount: {
            type: Number,
            default: 0,
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        endedAt: {
            type: Date,
            default: null,
        },
        lastSeenAt: {
            type: Date,
            default: Date.now,
        },
        socketId: {
            type: String,
            default: null,
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

// Indexes for efficient querying
proctoringSessionSchema.index({ examId: 1, studentId: 1 });
proctoringSessionSchema.index({ status: 1 });
proctoringSessionSchema.index({ lastHeartbeat: 1 });
proctoringSessionSchema.index({ startedAt: -1 });
// Prevent duplicate active sessions for the same student/exam
proctoringSessionSchema.index(
    { examId: 1, studentId: 1, status: 1 },
    {
        unique: true,
        partialFilterExpression: { status: { $in: ["INITIALIZING", "ACTIVE", "PAUSED"] } }
    }
);

export const ProctoringSession = mongoose.model("ProctoringSession", proctoringSessionSchema);
