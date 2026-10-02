import mongoose, { Schema } from "mongoose";

/**
 * ZMailMessage
 *
 * Represents a single email message inside a thread.
 * Attachment metadata is embedded; binary content stored on disk/cloud
 * referenced by storageKey. Bodies are stored here as plain text only —
 * rich HTML is NOT supported in v1 for simplicity and security.
 */

const attachmentSchema = new Schema(
    {
        originalName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 255,
        },
        // Sanitized filename for storage
        storageName: {
            type: String,
            required: true,
        },
        // Storage key / relative path — never an absolute filesystem path
        storageKey: {
            type: String,
            required: true,
        },
        mimeType: {
            type: String,
            required: true,
            maxlength: 127,
        },
        sizeBytes: {
            type: Number,
            required: true,
            min: 0,
        },
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const recipientSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        address: {
            type: String,
            required: true,
            lowercase: true,
        },
        name: {
            type: String,
            default: "",
        },
    },
    { _id: false }
);

const zmailMessageSchema = new Schema(
    {
        threadId: {
            type: Schema.Types.ObjectId,
            ref: "ZMailThread",
            required: true,
            index: true,
        },
        // Sender resolved server-side from JWT — never trusted from client
        senderUserId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        senderAddress: {
            type: String,
            required: true,
            lowercase: true,
        },
        senderName: {
            type: String,
            required: true,
            trim: true,
        },
        to: [recipientSchema],
        cc: { type: [recipientSchema], default: [] },
        bcc: { type: [recipientSchema], default: [] },
        subject: {
            type: String,
            required: true,
            trim: true,
            maxlength: 998,
            default: "(no subject)",
        },
        // Plain-text body. Max 200 KB body in DB.
        body: {
            type: String,
            required: true,
            maxlength: 204800,
        },
        attachments: {
            type: [attachmentSchema],
            default: [],
        },
        // For reply chains — refers to the message being replied to
        replyToMessageId: {
            type: Schema.Types.ObjectId,
            ref: "ZMailMessage",
            default: null,
        },
        // For forwards
        forwardedFromMessageId: {
            type: Schema.Types.ObjectId,
            ref: "ZMailMessage",
            default: null,
        },
        // Whether this is a draft (not yet sent)
        isDraft: {
            type: Boolean,
            default: false,
            index: true,
        },
        // Optimistic version counter for concurrent draft editing
        draftVersion: {
            type: Number,
            default: 0,
        },
        // Owned by sender only — drafts are owned by the creator
        draftOwnerId: {
            type: Schema.Types.ObjectId,
            default: null,
        },
        sentAt: {
            type: Date,
            default: null,
            index: true,
        },
    },
    { timestamps: true }
);

zmailMessageSchema.index({ threadId: 1, sentAt: 1 });
zmailMessageSchema.index({ senderUserId: 1, sentAt: -1 });
zmailMessageSchema.index({ isDraft: 1, draftOwnerId: 1, createdAt: -1 });

export const ZMailMessage = mongoose.model("ZMailMessage", zmailMessageSchema);
