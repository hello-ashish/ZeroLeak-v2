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
