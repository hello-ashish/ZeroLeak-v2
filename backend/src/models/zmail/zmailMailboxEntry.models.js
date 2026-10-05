import mongoose, { Schema } from "mongoose";

/**
 * ZMailMailboxEntry
 *
 * Per-user view of a message.
 * This is the central design that enables independent state:
 *   - Alice sees a message in "sent", Bob sees the same message in "inbox"
 *   - Bob marking read does not affect Alice
 *   - Alice deleting her sent copy does not affect Bob's inbox
 *
 * There is exactly one ZMailMailboxEntry per (userId × messageId) pair.
 */

const FOLDERS = ["inbox", "sent", "drafts", "trash", "archive", "all"];

const zmailMailboxEntrySchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, required: true, index: true },
        messageId: { type: Schema.Types.ObjectId, ref: "ZMailMessage", required: true, index: true },
        threadId: { type: Schema.Types.ObjectId, ref: "ZMailThread", required: true, index: true },
        folder: { type: String, enum: FOLDERS, required: true, index: true },
        isRead: { type: Boolean, default: false, index: true },
        isStarred: { type: Boolean, default: false },
        isImportant: { type: Boolean, default: false },
        // Soft-delete — message moved to trash
        isTrashed: { type: Boolean, default: false, index: true },
        trashedAt: { type: Date, default: null },
        // Archived (removed from inbox, still searchable)
        isArchived: { type: Boolean, default: false },
        archivedAt: { type: Date, default: null },
        // Hard-delete from user's perspective (NOT the underlying message)
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date, default: null },
        // When the user last opened this message
        lastSeenAt: { type: Date, default: null },
        // Labels / tags for future extensibility
        labels: { type: [String], default: [] },
    },
    { timestamps: true }
);

// Unique per user per message — prevents duplicate entries
zmailMailboxEntrySchema.index({ userId: 1, messageId: 1 }, { unique: true });
// Main inbox/folder query
zmailMailboxEntrySchema.index({ userId: 1, folder: 1, isTrashed: 1, isDeleted: 1, isArchived: 1, createdAt: -1 });
// Unread count query
zmailMailboxEntrySchema.index({ userId: 1, isRead: 1, isTrashed: 1, isDeleted: 1 });
// Starred query
zmailMailboxEntrySchema.index({ userId: 1, isStarred: 1, isTrashed: 1, isDeleted: 1 });
// Thread view
zmailMailboxEntrySchema.index({ userId: 1, threadId: 1, isDeleted: 1 });
// Trash cleanup query
zmailMailboxEntrySchema.index({ isTrashed: 1, trashedAt: 1 });

export const ZMailMailboxEntry = mongoose.model("ZMailMailboxEntry", zmailMailboxEntrySchema);
