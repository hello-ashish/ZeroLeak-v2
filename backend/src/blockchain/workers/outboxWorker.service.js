import { IntegrityOutbox } from "../../models/integrityOutbox.models.js";
import { commitIntegrityRecord } from "../private/privateBlockchain.service.js";

const MAX_RETRIES = 5;
const WORKER_INTERVAL_MS = 5000;

export async function processOutbox() {
    try {
        const records = await IntegrityOutbox.find({
            status: { $in: ["PENDING", "FAILED"] },
            retryCount: { $lt: MAX_RETRIES }
        }).sort({ createdAt: 1 }).limit(10);

        for (const record of records) {
            try {
                const resultJson = await commitIntegrityRecord(
                    record.eventId,
                    record.commitmentType,
                    record.canonicalHash,
                    JSON.stringify(record.payload)
                );
                
                const result = JSON.parse(resultJson);
                
                record.status = "CONFIRMED";
                record.privateTransactionId = result.txId || null;
                record.processedAt = new Date();
                await record.save();
                console.log(`[OutboxWorker] Successfully committed ${record.eventId}`);
            } catch (error) {
                record.retryCount += 1;
                record.lastError = error.message;
                record.status = record.retryCount >= MAX_RETRIES ? "FAILED" : "PENDING";
                await record.save();
                console.error(`[OutboxWorker] Failed to commit ${record.eventId}: ${error.message}`);
            }
        }
    } catch (error) {
        console.error("[OutboxWorker] Error querying outbox:", error);
    }
}

let outboxInterval = null;

export function startOutboxWorker() {
    if (outboxInterval) return;
    console.log("[OutboxWorker] Started.");
    outboxInterval = setInterval(processOutbox, WORKER_INTERVAL_MS);
}
