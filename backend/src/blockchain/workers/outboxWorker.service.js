import { IntegrityOutbox } from "../../models/integrityOutbox.models.js";
import { commitIntegrityRecord, getIntegrityRecord } from "../private/privateBlockchain.service.js";
import { AuditLog } from "../../models/auditlog.models.js";

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
                // Check idempotency: Did we already successfully commit this but crash before saving?
                let isAlreadyConfirmed = false;
                let existingRecordTxId = null;
                try {
                    const existingRecord = await getIntegrityRecord(record.eventId);
                    if (existingRecord) {
                        isAlreadyConfirmed = true;
                        existingRecordTxId = existingRecord.txId; // if available
                    }
                } catch (err) {
                    // It doesn't exist on Fabric, which is expected.
                }

                if (isAlreadyConfirmed) {
                    record.status = "CONFIRMED";
                    record.privateTransactionId = existingRecordTxId;
                    record.processedAt = new Date();
                    await record.save();
                    
                    // Update audit logs
                    await AuditLog.updateMany(
                        { outboxEventId: record.eventId },
                        { $set: { commitmentStatus: "CONFIRMED", isCommitted: true } }
                    );
                    
                    console.log(`[OutboxWorker] Recovered existing commitment for ${record.eventId}`);
                    continue;
                }

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
                
                await AuditLog.updateMany(
                    { outboxEventId: record.eventId },
                    { $set: { commitmentStatus: "CONFIRMED", isCommitted: true } }
                );
                
                console.log(`[OutboxWorker] Successfully committed ${record.eventId}`);
            } catch (error) {
                record.retryCount += 1;
                record.lastError = error.message;
                record.status = record.retryCount >= MAX_RETRIES ? "FAILED" : "PENDING";
                await record.save();
                
                if (record.status === "FAILED") {
                    await AuditLog.updateMany(
                        { outboxEventId: record.eventId },
                        { $set: { commitmentStatus: "FAILED" } }
                    );
                }
                
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
