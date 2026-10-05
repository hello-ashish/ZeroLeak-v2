import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, required: true, // We don't strictly ref a single collection because it could be Admin, Auditor, Student, or Professor },
        userRole: { type: String, enum: ["Admin", "Auditor", "Student", "Professor"], required: true },
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true },
        type: { type: String, enum: ["INFO", "WARNING", "SUCCESS", "ERROR"], default: "INFO" },
        isRead: { type: Boolean, default: false },
        relatedLink: { type: String, default: null }
    },
    { timestamps: true }
);

// Index for efficient querying by user and read status
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model("Notification", notificationSchema);
