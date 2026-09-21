import mongoose from "mongoose";

const anchorStateSchema = new mongoose.Schema(
    {
        _id: {
            type: String,
            default: "global",
        },
        sequence: {
            type: Number,
            default: 0,
        },
        lastAnchoredHeight: {
            type: Number,
            default: -1,
        },
        lockedAt: {
            type: Date,
            default: null,
        },
        lockedBy: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

export const AnchorState = mongoose.model("AnchorState", anchorStateSchema);
