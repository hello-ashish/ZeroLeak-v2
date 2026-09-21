import { Exam } from "../models/exam.models.js";
import { Batch } from "../models/batch.models.js";
import { Question } from "../models/question.models.js";
import { Result } from "../models/result.models.js";
import { CheatingIncident } from "../models/cheatingIncident.models.js";
import { AuditLog } from "../models/auditlog.models.js";
import { buildMerkleRoot } from "../Services/merkle.service.js";
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
}, session = null) {
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
        { upsert: true, new: true, session }
    );

    return outboxRecord;
}

export async function recomputeEntityHash(objectType, objectId, outboxPayload) {
    try {
        switch (objectType) {
            case "Exam": {
                const exam = await Exam.findById(objectId);
                if (!exam) return null;
                return sha256(JSON.stringify(canonicalize({
                    title: exam.title,
                    startTime: exam.startTime,
                    duration: exam.duration,
                    passingMarks: exam.passingMarks,
                    totalMarks: exam.totalMarks,
                    questions: exam.questions,
                    questionMerkleRoot: exam.questionMerkleRoot
                })));
            }
            case "Batch": {
                const batch = await Batch.findById(objectId);
                if (!batch) return null;
                const questions = await Question.find({ batchIds: batch._id });
                const questionHashes = questions.map(q => q.contentHash);
                const merkleRoot = buildMerkleRoot(questionHashes);
                return sha256(JSON.stringify(canonicalize({
                    subject: batch.subject,
                    questionCount: questions.length,
                    merkleRoot: merkleRoot,
                    actorId: outboxPayload?.actorId
                })));
            }
            case "Result": {
                const result = await Result.findById(objectId);
                if (!result) return null;
                return sha256(JSON.stringify(canonicalize({
                    examId: String(result.exam),
                    studentId: String(result.student),
                    score: result.score,
                    passed: result.passed,
                    timestamp: result.createdAt
                })));
            }
            case "CheatingIncident": {
                const incident = await CheatingIncident.findById(objectId);
                if (!incident) return null;
                return sha256(JSON.stringify(canonicalize({
                    studentId: String(incident.student),
                    examId: String(incident.exam),
                    violationType: incident.violationType,
                    severity: incident.severity,
                    actionTaken: incident.actionTaken,
                    timestamp: incident.detectedAt
                })));
            }
            case "AuditBatch": {
                // If it's an audit batch, the payload doesn't contain 'eventId' normally, but we have outboxEventId on the log
                // Let's use the eventId from the outbox record as the key
                // Actually the outbox eventId is like "AuditBatch_AUDIT_BATCH_123_1_AUDIT_BATCH"
                // But the AuditLog stores outboxEventId.
                const logs = await AuditLog.find({ outboxEventId: outboxPayload?.eventId || objectId }).sort({ createdAt: 1 });
                if (logs.length === 0) return null;
                const hashes = logs.map(log => {
                    const p = canonicalize({
                        logId: String(log._id),
                        actor: log.actor,
                        action: log.action,
                        targetId: log.targetId,
                        timestamp: log.createdAt
                    });
                    return sha256(JSON.stringify(p));
                });
                const root = buildMerkleRoot(hashes);
                return sha256(JSON.stringify(canonicalize({
                    eventCount: logs.length,
                    firstEventId: String(logs[0]._id),
                    lastEventId: String(logs[logs.length - 1]._id),
                    merkleRoot: root
                })));
            }
            default:
                return null;
        }
    } catch (e) {
        console.error("Error recomputing hash:", e);
        return null;
    }
}
