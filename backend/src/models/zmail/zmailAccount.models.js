import mongoose, { Schema } from "mongoose";

/**
 * ZMailAccount
 *
 * One account per ZeroLeak user (Student | Professor | Admin | Auditor).
 * The zmailAddress is the stable internal identity. It is generated once
 * and never changed when the user's display name changes.
 * Administrators can change it via a dedicated protected endpoint.
 */
const zmailAccountSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
        userType: { type: String, enum: ["Student", "Professor", "Admin", "Auditor", "SYSTEM", "Support"], required: true },
        // Whether this is the special support system mailbox
        isSupportMailbox: { type: Boolean, default: false, index: true },
        // e.g. "rahul@zeroleak.com" — stable, never mutated by display-name changes
        zmailAddress: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^[a-z0-9._+-]+@zeroleak\.com$/, "Invalid ZMail address format"],
        },
        // Normalised form for case-insensitive dedup lookups
        normalizedAddress: { type: String, required: true, unique: true, lowercase: true, trim: true },
        displayName: { type: String, required: true, trim: true },
        mailboxStatus: { type: String, enum: ["active", "suspended", "deleted"], default: "active" },
        // Running byte total of all message bodies in this mailbox
        storageUsedBytes: { type: Number, default: 0, min: 0 },
        // Cached unread count — reconcilable from MailboxEntry
        cachedUnreadCount: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

zmailAccountSchema.index({ zmailAddress: 1 });
zmailAccountSchema.index({ normalizedAddress: 1 });
zmailAccountSchema.index({ userId: 1, userType: 1 });

export const ZMailAccount = mongoose.model("ZMailAccount", zmailAccountSchema);
