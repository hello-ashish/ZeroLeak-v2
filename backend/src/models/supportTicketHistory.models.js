import mongoose, { Schema } from "mongoose";

/**
 * SupportTicketHistory — audit log of all meaningful ticket lifecycle events.
 */

export const HISTORY_EVENTS = [
    "created","assigned","reassigned","unassigned",
    "priority_changed","status_changed",
    "support_reply","user_reply","internal_note_added",
    "resolved","reopened","closed",
];

const supportTicketHistorySchema = new Schema({
    ticketId: { type: Schema.Types.ObjectId, ref: "SupportTicket", required: true, index: true },
    ticketNumber: { type: String, required: true },

    event:     { type: String, enum: HISTORY_EVENTS, required: true },
    actorId:   { type: Schema.Types.ObjectId, required: true },
    actorRole: { type: String, required: true },
    actorName: { type: String, default: "" },

    // Metadata for the event (previous/next value for changes, etc.)
    metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

supportTicketHistorySchema.index({ ticketId: 1, createdAt: 1 });
supportTicketHistorySchema.index({ actorId: 1, event: 1 });

export const SupportTicketHistory = mongoose.model("SupportTicketHistory", supportTicketHistorySchema);
