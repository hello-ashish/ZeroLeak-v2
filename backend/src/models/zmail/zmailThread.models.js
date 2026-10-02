import mongoose, { Schema } from "mongoose";

/**
 * ZMailThread
 *
 * Represents a conversation/thread.
 * The thread document stores shared metadata that all participants see.
 * Individual per-user state (read/starred/folder) lives in ZMailMailboxEntry.
 *
 * Message bodies are NOT stored here — only summary/snippet metadata.
 */
const zmailThreadSchema = new Schema(
    {
        subject: {
            type: String,
            required: true,
            trim: true,
            maxlength: 998,
            default: "(no subject)",
        },
        // All unique participant userIds in this thread (for quick auth checks)
        participantIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "ZMailAccount",
                index: true,
            },
        ],
        // ZMail addresses of all participants (for display / search)
        participantAddresses: [String],
        // Pointer to the most recent message
        latestMessageId: {
            type: Schema.Types.ObjectId,
            ref: "ZMailMessage",
            default: null,
        },
        latestMessageAt: {
            type: Date,
            default: null,
            index: true,
        },
        // Rolling count — avoids COUNT queries
        messageCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Short preview of the latest message body
        snippet: {
            type: String,
            default: "",
            maxlength: 300,
        },
        // Whether any message in the thread has an attachment
        hasAttachment: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

zmailThreadSchema.index({ participantIds: 1, latestMessageAt: -1 });
zmailThreadSchema.index({ latestMessageAt: -1 });

export const ZMailThread = mongoose.model("ZMailThread", zmailThreadSchema);
