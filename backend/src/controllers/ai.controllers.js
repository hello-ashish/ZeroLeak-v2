import { generateBatchDetails, generateQuestionDetails, repairImportedQuestion, batchRepairImportedQuestions } from "../Services/ai/ai.service.js"
import { getConfidenceLabel } from "../Services/ai/ai.policy.js"

export const generateBatch = async (req, res) => {
    try {
        const { name } = req.body

        // Validate input
        if (!name || typeof name !== "string" || name.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: "Batch name must be at least 3 characters long.",
            })
        }

        const cleanName = name.trim()

        // Reject meaningless names
        if (/^[^a-zA-Z]*$/.test(cleanName)) {
            return res.status(400).json({
                success: false,
                message: "Batch name must contain meaningful text.",
            })
        }

        const result = await generateBatchDetails(cleanName, req.professor._id)

        if (!result.success) {
            return res.status(422).json({
                success: false,
                message: result.error || "Unable to generate batch details.",
            })
        }

        return res.status(200).json({
            success: true,
            data: {
                ...result.data,
                confidenceLabel: getConfidenceLabel(result.data.confidence),
            },
        })
    } catch (error) {
        console.error("[AI] Batch generation error:", error.message)
        return res.status(500).json({
            success: false,
            message: "Unable to generate AI content. Please try again.",
        })
    }
}

export const generateQuestion = async (req, res) => {
    try {
        const { question, subject, topic, clarification } = req.body

        // Validate input
        if (!question || typeof question !== "string" || question.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: "Question text must be at least 10 characters long.",
            })
        }

        const result = await generateQuestionDetails(
            question.trim(),
            subject?.trim() || "",
            topic?.trim() || "",
            clarification?.trim() || "",
            req.professor._id
        )

        if (!result.success) {
            return res.status(422).json({
                success: false,
                message: result.error || "Unable to generate question details.",
            })
        }

        return res.status(200).json({
            success: true,
            data: {
                ...result.data,
                confidenceLabel: getConfidenceLabel(result.data.confidence),
            },
        })
    } catch (error) {
        console.error("[AI] Question generation error:", error.message)
        return res.status(500).json({
            success: false,
            message: "Unable to generate AI content. Please try again.",
        })
    }
}

export const fixQuestionImport = async (req, res) => {
    try {
        const { row, rows, context, missingFields } = req.body

        // Validate context
        const subject = context?.subject?.trim() || ""

        // Single row repair
        if (row && missingFields) {
            if (!row.title && !missingFields.includes("title")) {
                // If there's no question text at all and it's not in missing fields, we can't repair
            }

            if (!Array.isArray(missingFields) || missingFields.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No missing fields specified for repair.",
                })
            }

            const result = await repairImportedQuestion(row, missingFields, subject, req.professor._id)

            if (!result.success) {
                return res.status(422).json({
                    success: false,
                    message: result.error || "Unable to repair this question.",
                })
            }

            return res.status(200).json({
                success: true,
                data: {
                    ...result.data,
                    confidenceLabel: getConfidenceLabel(result.data.confidence),
                },
            })
        }

        // Batch repair
        if (Array.isArray(rows) && rows.length > 0) {
            // Validate max batch size
            if (rows.length > 50) {
                return res.status(400).json({
                    success: false,
                    message: "Maximum 50 rows per batch repair request.",
                })
            }

            // Validate each row has required structure
            for (const r of rows) {
                if (!r.row || !Array.isArray(r.missingFields) || r.missingFields.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Each row must have 'row' data and 'missingFields' array.",
                    })
                }
                if (r.rowIndex === undefined) {
                    return res.status(400).json({
                        success: false,
                        message: "Each row must have a 'rowIndex'.",
                    })
                }
            }

            const result = await batchRepairImportedQuestions(rows, subject, req.professor._id)

            if (!result.success) {
                return res.status(422).json({
                    success: false,
                    message: result.error || "Unable to repair questions.",
                })
            }

            // Add confidence labels
            const dataWithLabels = result.data.map(item => ({
                ...item,
                data: {
                    ...item.data,
                    confidenceLabel: getConfidenceLabel(item.data.confidence || 0),
                }
            }))

            return res.status(200).json({
                success: true,
                data: dataWithLabels,
            })
        }

        return res.status(400).json({
            success: false,
            message: "Provide either 'row' with 'missingFields', or 'rows' array for batch repair.",
        })
    } catch (error) {
        console.error("[AI] CSV repair error:", error.message)
        return res.status(500).json({
            success: false,
            message: "Unable to repair with AI. Please try again.",
        })
    }
}

export const reviewBatchAdmin = async (req, res) => {
    try {
        const { batchData } = req.body
        if (!batchData) {
            return res.status(400).json({ message: "batchData is required" })
        }

        const { adminReviewBatch } = await import('../Services/ai/ai.service.js')
        const result = await adminReviewBatch(batchData, req.admin._id)

        if (!result.success) {
            return res.status(400).json({
                message: result.error || "Unable to review batch."
            })
        }

        return res.status(200).json(result.data)
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message })
    }
}

export const auditSummaryAdmin = async (req, res) => {
    try {
        const { logs } = req.body
        if (!logs) {
            return res.status(400).json({ message: "logs array is required" })
        }

        const { adminAuditSummary } = await import('../Services/ai/ai.service.js')
        const result = await adminAuditSummary(logs, req.admin._id)

        if (!result.success) {
            console.error("AI Audit Summary Error:", result.error);
            return res.status(400).json({
                message: result.error || "Unable to summarize logs."
            })
        }

        return res.status(200).json(result.data)
    } catch (error) {
        console.error("AI Audit Summary Exception:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message })
    }
}

export const cohortReportAdmin = async (req, res) => {
    try {
        const { gradebookData } = req.body
        if (!gradebookData) {
            return res.status(400).json({ message: "gradebookData is required" })
        }

        const { adminCohortReport } = await import('../Services/ai/ai.service.js')
        const result = await adminCohortReport(gradebookData, req.admin._id)

        if (!result.success) {
            console.error("AI Cohort Report Error:", result.error);
            return res.status(400).json({
                message: result.error || "Unable to generate report."
            })
        }

        return res.status(200).json(result.data)
    } catch (error) {
        console.error("AI Cohort Report Exception:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message })
    }
}

export const examCopilotAdmin = async (req, res) => {
    try {
        const { prompt } = req.body
        if (!prompt) {
            return res.status(400).json({ message: "prompt is required" })
        }

        const { adminExamCopilot } = await import('../Services/ai/ai.service.js')
        const result = await adminExamCopilot(prompt, req.admin._id)

        if (!result.success) {
            return res.status(400).json({
                message: result.error || "Unable to parse copilot prompt."
            })
        }

        return res.status(200).json(result.data)
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message })
    }
}

export const policyRewriteAdmin = async (req, res) => {
    try {
        const { draft } = req.body
        if (!draft) {
            return res.status(400).json({ message: "draft text is required" })
        }

        const { adminPolicyRewrite } = await import('../Services/ai/ai.service.js')
        const result = await adminPolicyRewrite(draft, req.admin._id)

        if (!result.success) {
            return res.status(400).json({
                message: result.error || "Unable to rewrite policy."
            })
        }

        return res.status(200).json(result.data)
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message })
    }
}
