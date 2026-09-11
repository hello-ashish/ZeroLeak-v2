import { Question } from "../models/question.models.js"
import { Exam } from "../models/exam.models.js"
import {
    encryptQuestionContent,
    hashQuestionContent,
    decryptQuestionContent,
} from "../Services/crypto.service.js"

export const createQuestion = async (req, res) => {
    try {
        const {
            title,
            options,
            correctAnswer,
            difficultyLevel,
            subject,
            topic,
            correctAnswerIndex,
        } = req.body

        if (
            !title ||
            !options ||
            !correctAnswer ||
            !difficultyLevel ||
            !subject ||
            !topic ||
            correctAnswerIndex === undefined
        ) {
            return res.status(400).json({
                message: "All fields are required",
            })
        }

        // Sensitive question data
        const sensitiveContent = {
            title,
            options,
            correctAnswer,
            correctAnswerIndex,
        }

        // Create SHA-256 integrity fingerprint
        const contentHash =
            hashQuestionContent(sensitiveContent)

        // Encrypt sensitive question data
        const encryptedContent =
            encryptQuestionContent(sensitiveContent)

        // Store only encrypted sensitive content
        const question = await Question.create({
            encryptedContent,
            contentHash,
            difficultyLevel,
            subject,
            topic,
            createdBy: req.professor._id,
        })

        return res.status(201).json({
            message: "Question created successfully",
            question,
        })
    } catch (error) {
        console.error("Error creating question: ", error)

        return res.status(500).json({
            message: "Internal server error while creating question",
        })
    }
}

export const getProfessorQuestions = async (req, res) => {
    try {
        const questions = await Question.find({
            createdBy: req.professor._id,
        })
            .sort({ createdAt: -1 })
            .lean()

        const safeQuestions = questions.map((question) => {
            let decryptedContent = {}

            try {
                if (question.encryptedContent) {
                    decryptedContent =
                        decryptQuestionContent(
                            question.encryptedContent
                        )
                }
            } catch (error) {
                console.error(
                    `Unable to decrypt question ${question._id}:`,
                    error.message
                )
            }

            return {
                _id: question._id,
                title:
                    decryptedContent.title ||
                    "[Protected Question]",
                options:
                    decryptedContent.options || [],
                difficultyLevel:
                    question.difficultyLevel,
                subject: question.subject,
                topic: question.topic,
                createdAt: question.createdAt,
            }
        })

        return res.status(200).json({
            message: "Questions fetched successfully",
            questions: safeQuestions,
        })

    } catch (error) {
        console.error(
            "Error fetching questions: ",
            error
        )

        return res.status(500).json({
            message:
                "Something went wrong while fetching questions",
        })
    }
}
export const getAllQuestions = async (req, res) => {
    try {
        const questions = await Question.find({})
            .sort({ createdAt: -1 })
            .lean()

        const exams = await Exam.find({}).lean()

        const usageMap = {}

        exams.forEach((exam) => {
            exam.questions.forEach((qId) => {
                const id = String(qId)
                usageMap[id] = (usageMap[id] || 0) + 1
            })
        })

        const questionsWithHealth = questions.map((question) => {
            let decryptedContent = {}

            try {
                if (
                    question.encryptedContent &&
                    question.contentHash
                ) {
                    decryptedContent =
                        decryptQuestionContent(
                            question.encryptedContent
                        )
                }
            } catch (error) {
                console.error(
                    `Unable to decrypt question ${question._id}:`,
                    error.message
                )
            }

            return {
                _id: question._id,
                title: decryptedContent.title || "[Protected Question]",
                options: decryptedContent.options || [],
                difficultyLevel:
                    question.difficultyLevel,
                subject: question.subject,
                topic: question.topic,
                createdBy: question.createdBy,
                createdAt: question.createdAt,

                health: {
                    usageCount:
                        usageMap[String(question._id)] || 0,
                    successRate: 0,
                    flagged: false,
                },
            }
        })

        return res.status(200).json({
            message: "All questions fetched successfully",
            questions: questionsWithHealth,
        })

    } catch (error) {
        console.error(
            "Error fetching all questions: ",
            error
        )

        return res.status(500).json({
            message:
                "Something went wrong while fetching all questions",
        })
    }
}