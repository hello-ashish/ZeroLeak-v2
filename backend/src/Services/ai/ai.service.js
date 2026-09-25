import Groq from "groq-sdk"
import crypto from "crypto"
import { AI_MODEL, PROMPT_VERSIONS } from "./ai.policy.js"
import { BATCH_GENERATE_PROMPT, QUESTION_GENERATE_PROMPT, CSV_REPAIR_PROMPT, CSV_BATCH_REPAIR_PROMPT } from "./ai.prompts.js"
import { validateBatchResponse, validateQuestionResponse, validateCsvRepairResponse, validateBatchCsvRepairResponse } from "./ai.validation.js"
import { AuditLog } from "../../models/auditlog.models.js"

let groqClient = null

function getClient() {
    if (!groqClient) {
        const apiKey = process.env.GROQ_API_KEY
        if (!apiKey) {
            throw new Error("GROQ_API_KEY is not configured in environment variables.")
        }
        groqClient = new Groq({ apiKey })
    }
    return groqClient
}

async function callLLM(systemPrompt, userPrompt, jsonSchema) {
    const client = getClient()

    const params = {
        model: AI_MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: jsonSchema
            ? { type: "json_schema", json_schema: jsonSchema }
            : { type: "json_object" },
    }

    const completion = await client.chat.completions.create(params)

    const content = completion.choices?.[0]?.message?.content
    if (!content) {
        throw new Error("LLM returned empty response")
    }

    try {
        let jsonContent = content.trim()
        if (jsonContent.startsWith("```json")) {
            jsonContent = jsonContent.substring(7).trim()
            if (jsonContent.endsWith("```")) {
                jsonContent = jsonContent.slice(0, -3).trim()
            }
        } else if (jsonContent.startsWith("```")) {
            jsonContent = jsonContent.substring(3).trim()
            if (jsonContent.endsWith("```")) {
                jsonContent = jsonContent.slice(0, -3).trim()
            }
        }
        return JSON.parse(jsonContent)
    } catch (e) {
        throw new Error("LLM returned non-JSON response: " + content.substring(0, 200))
    }
}

async function logAiAction({ professorId, action, promptVersion, requestData, responseData, status }) {
    try {
        const requestHash = crypto.createHash("sha256").update(JSON.stringify(requestData)).digest("hex")
        const responseHash = crypto.createHash("sha256").update(JSON.stringify(responseData)).digest("hex")

        await AuditLog.create({
            actor: professorId.toString(),
            actorRole: "Professor",
            action,
            targetType: "AI",
            details: JSON.stringify({
                promptVersion,
                modelVersion: AI_MODEL,
                requestHash,
                responseHash,
            }),
            status: status === "SUCCESS" ? "success" : "failure",
        })
    } catch (err) {
        console.error("[AI AUDIT] Failed to log AI action:", err.message)
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateBatchDetails(name, professorId) {
    const requestData = { name }

    try {
        const raw = await callLLM(
            BATCH_GENERATE_PROMPT.system,
            BATCH_GENERATE_PROMPT.user(name),
            {
                name: "batch_details",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        subject: { type: "string" },
                        description: { type: "string" },
                        needsReview: { type: "boolean" },
                        reason: { type: "string" },
                        confidence: { type: "number" },
                    },
                    required: ["subject", "description", "needsReview", "reason", "confidence"],
                    additionalProperties: false,
                }
            }
        )

        const validated = validateBatchResponse(raw)

        await logAiAction({
            professorId,
            action: "AI_GENERATE_BATCH",
            promptVersion: PROMPT_VERSIONS.BATCH,
            requestData,
            responseData: validated.valid ? validated.data : raw,
            status: validated.valid ? "SUCCESS" : "FAILURE",
        })

        if (!validated.valid) {
            return { success: false, error: validated.error }
        }

        return { success: true, data: validated.data }
    } catch (error) {
        await logAiAction({
            professorId,
            action: "AI_GENERATE_BATCH",
            promptVersion: PROMPT_VERSIONS.BATCH,
            requestData,
            responseData: { error: error.message },
            status: "FAILURE",
        })
        throw error
    }
}

/**
 * Generate question details (topic, difficulty, options, correct answer) from question text.
 */
export async function generateQuestionDetails(question, subject, topic, clarification, professorId) {
    const requestData = { question, subject, topic, clarification }

    try {
        const raw = await callLLM(
            QUESTION_GENERATE_PROMPT.system,
            QUESTION_GENERATE_PROMPT.user(question, subject, topic, clarification),
            {
                name: "question_details",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        topic: { type: "string" },
                        difficultyLevel: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        correctAnswerIndex: { type: "number" },
                        correctAnswer: { type: "string" },
                        needsReview: { type: "boolean" },
                        reason: { type: "string" },
                        confidence: { type: "number" },
                    },
                    required: ["topic", "difficultyLevel", "options", "correctAnswerIndex", "correctAnswer", "needsReview", "reason", "confidence"],
                    additionalProperties: false,
                }
            }
        )

        const validated = validateQuestionResponse(raw)

        await logAiAction({
            professorId,
            action: "AI_GENERATE_QUESTION",
            promptVersion: PROMPT_VERSIONS.QUESTION,
            requestData,
            responseData: validated.valid ? validated.data : raw,
            status: validated.valid ? "SUCCESS" : "FAILURE",
        })

        if (!validated.valid) {
            return { success: false, error: validated.error }
        }

        return { success: true, data: validated.data }
    } catch (error) {
        await logAiAction({
            professorId,
            action: "AI_GENERATE_QUESTION",
            promptVersion: PROMPT_VERSIONS.QUESTION,
            requestData,
            responseData: { error: error.message },
            status: "FAILURE",
        })
        throw error
    }
}

/**
 * Repair a single incomplete CSV row.
 */
export async function repairImportedQuestion(row, missingFields, subject, professorId) {
    const requestData = { row, missingFields, subject }

    try {
        const raw = await callLLM(
            CSV_REPAIR_PROMPT.system,
            CSV_REPAIR_PROMPT.user(row, missingFields, subject),
            {
                name: "csv_repair",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        topic: { type: "string" },
                        difficultyLevel: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        correctAnswerIndex: { type: "number" },
                        correctAnswer: { type: "string" },
                        needsReview: { type: "boolean" },
                        reason: { type: "string" },
                        confidence: { type: "number" },
                    },
                    required: ["title", "topic", "difficultyLevel", "options", "correctAnswerIndex", "correctAnswer", "needsReview", "reason", "confidence"],
                    additionalProperties: false,
                }
            }
        )

        const validated = validateCsvRepairResponse(raw, row, missingFields)

        await logAiAction({
            professorId,
            action: "AI_REPAIR_CSV",
            promptVersion: PROMPT_VERSIONS.CSV_REPAIR,
            requestData,
            responseData: validated.valid ? validated.data : raw,
            status: validated.valid ? "SUCCESS" : "FAILURE",
        })

        if (!validated.valid) {
            return { success: false, error: validated.error }
        }

        return { success: true, data: validated.data }
    } catch (error) {
        await logAiAction({
            professorId,
            action: "AI_REPAIR_CSV",
            promptVersion: PROMPT_VERSIONS.CSV_REPAIR,
            requestData,
            responseData: { error: error.message },
            status: "FAILURE",
        })
        throw error
    }
}

/**
 * Batch repair multiple incomplete CSV rows in a single LLM call.
 * Each row maintains a stable rowIndex to map back to the frontend.
 */
export async function batchRepairImportedQuestions(rows, subject, professorId) {
    const requestData = { rowCount: rows.length, subject }

    try {
        const raw = await callLLM(
            CSV_BATCH_REPAIR_PROMPT.system,
            CSV_BATCH_REPAIR_PROMPT.user(rows, subject),
            {
                name: "batch_csv_repair",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        rows: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    title: { type: "string" },
                                    topic: { type: "string" },
                                    difficultyLevel: { type: "string" },
                                    options: { type: "array", items: { type: "string" } },
                                    correctAnswerIndex: { type: "number" },
                                    correctAnswer: { type: "string" },
                                    needsReview: { type: "boolean" },
                                    reason: { type: "string" },
                                    confidence: { type: "number" },
                                },
                                required: ["title", "topic", "difficultyLevel", "options", "correctAnswerIndex", "correctAnswer", "needsReview", "reason", "confidence"],
                                additionalProperties: false,
                            }
                        }
                    },
                    required: ["rows"],
                    additionalProperties: false
                }
            }
        )

        // The LLM might return { rows: [...] } or just [...] or another key containing the array
        let dataArray = null
        if (Array.isArray(raw)) {
            dataArray = raw
        } else if (raw && typeof raw === 'object') {
            if (Array.isArray(raw.rows)) {
                dataArray = raw.rows
            } else {
                // Find the first array value in the object (e.g. if they returned { "results": [...] })
                const firstArray = Object.values(raw).find(val => Array.isArray(val))
                if (firstArray) dataArray = firstArray
            }
        }

        if (!dataArray) {
            return { success: false, error: "AI returned unexpected batch repair format" }
        }

        const validated = validateBatchCsvRepairResponse(dataArray, rows)

        await logAiAction({
            professorId,
            action: "AI_BATCH_REPAIR_CSV",
            promptVersion: PROMPT_VERSIONS.CSV_REPAIR,
            requestData,
            responseData: { repairedCount: validated.valid ? validated.data.length : 0 },
            status: validated.valid ? "SUCCESS" : "FAILURE",
        })

        if (!validated.valid) {
            return { success: false, error: validated.error }
        }

        return { success: true, data: validated.data }
    } catch (error) {
        await logAiAction({
            professorId,
            action: "AI_BATCH_REPAIR_CSV",
            promptVersion: PROMPT_VERSIONS.CSV_REPAIR,
            requestData,
            responseData: { error: error.message },
            status: "FAILURE",
        })
        throw error
    }
}

export async function adminReviewBatch(batchData, adminId) {
    try {
        const { ADMIN_BATCH_REVIEW_PROMPT } = await import('./ai.prompts.js');
        const raw = await callLLM(
            ADMIN_BATCH_REVIEW_PROMPT.system,
            ADMIN_BATCH_REVIEW_PROMPT.user(batchData),
            {
                name: "admin_batch_review",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        isApproved: { type: "boolean" },
                        issues: { type: "array", items: { type: "string" } },
                        summary: { type: "string" },
                        difficultySkew: { type: "string" }
                    },
                    required: ["isApproved", "issues", "summary", "difficultySkew"],
                    additionalProperties: false
                }
            }
        );
        return { success: true, data: raw };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function adminAuditSummary(logs, adminId) {
    try {
        const { ADMIN_AUDIT_SUMMARY_PROMPT } = await import('./ai.prompts.js');
        const raw = await callLLM(
            ADMIN_AUDIT_SUMMARY_PROMPT.system,
            ADMIN_AUDIT_SUMMARY_PROMPT.user(logs),
            {
                name: "admin_audit_summary",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        status: { type: "string" },
                        summaryMarkdown: { type: "string" }
                    },
                    required: ["status", "summaryMarkdown"],
                    additionalProperties: false
                }
            }
        );
        return { success: true, data: raw };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function adminCohortReport(gradebookData, adminId) {
    try {
        const { ADMIN_COHORT_REPORT_PROMPT } = await import('./ai.prompts.js');
        const raw = await callLLM(
            ADMIN_COHORT_REPORT_PROMPT.system,
            ADMIN_COHORT_REPORT_PROMPT.user(gradebookData),
            {
                name: "admin_cohort_report",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        atRiskStudents: { type: "array", items: { type: "string" } },
                        cohortAnalysis: { type: "string" },
                        recommendedActions: { type: "array", items: { type: "string" } }
                    },
                    required: ["atRiskStudents", "cohortAnalysis", "recommendedActions"],
                    additionalProperties: false
                }
            }
        );
        return { success: true, data: raw };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function adminExamCopilot(prompt, adminId) {
    try {
        const { ADMIN_EXAM_COPILOT_PROMPT } = await import('./ai.prompts.js');
        const raw = await callLLM(
            ADMIN_EXAM_COPILOT_PROMPT.system,
            ADMIN_EXAM_COPILOT_PROMPT.user(prompt),
            {
                name: "admin_exam_copilot",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        mode: { type: "string", enum: ["Normal", "Zeroleak"] },
                        subjects: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    subject: { type: "string" },
                                    numQuestions: { type: "number" },
                                    durationMinutes: { type: "number" },
                                    passingPercentage: { type: "number" }
                                },
                                required: ["subject", "numQuestions", "durationMinutes", "passingPercentage"],
                                additionalProperties: false
                            }
                        }
                    },
                    required: ["title", "description", "mode", "subjects"],
                    additionalProperties: false
                }
            }
        );
        return { success: true, data: raw };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function adminPolicyRewrite(draft, adminId) {
    try {
        const { ADMIN_POLICY_REWRITE_PROMPT } = await import('./ai.prompts.js');
        const raw = await callLLM(
            ADMIN_POLICY_REWRITE_PROMPT.system,
            ADMIN_POLICY_REWRITE_PROMPT.user(draft),
            {
                name: "admin_policy_rewrite",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        rewrittenText: { type: "string" }
                    },
                    required: ["rewrittenText"],
                    additionalProperties: false
                }
            }
        );
        return { success: true, data: raw };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

