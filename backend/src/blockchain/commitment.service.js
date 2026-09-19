import crypto from "crypto";
import { IntegrityOutbox } from "../models/integrityOutbox.models.js";

export function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
        return Object.keys(value)
            .sort()
            .reduce((out, key) => {
                out[key] = canonicalize(value[key]);
                return out;
            }, {});
    }
    return value;
}

export function sha256(value) {
    return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export async function createCommitment({
    objectType,
    objectId,
    objectVersion = 1,
    commitmentType,
    payload,
}) {
    const canonicalPayload = canonicalize(payload);
    const payloadString = JSON.stringify(canonicalPayload);
    const canonicalHash = sha256(payloadString);

    const eventId = `${objectType}_${objectId}_${objectVersion}_${commitmentType}`;

    const outboxRecord = await IntegrityOutbox.findOneAndUpdate(
        { eventId },
        {
            $setOnInsert: {
                eventId,
                objectType,
                objectId: String(objectId),
                objectVersion,
                commitmentType,
                canonicalHash,
                payload: canonicalPayload,
                status: "PENDING",
            }
        },
        { upsert: true, new: true }
    );

    return outboxRecord;
}
