import { Question } from "../models/question.models.js"
import { Exam } from "../models/exam.models.js"
import {
    encryptQuestionContent,
    hashQuestionContent,
    decryptQuestionContent,
} from "../Services/crypto.service.js"
import { enqueueQuestionCommitment } from "../Services/integrityOutbox.service.js";

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

        enqueueQuestionCommitment(question, 1, '').catch(err =>
            console.error('[FABRIC] Failed to enqueue question commitment:', err.message)
        );
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
                correctAnswerIndex:
                    decryptedContent.correctAnswerIndex,
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
        const { page = 1, limit = 10, search = '', difficulty = '', subject = '' } = req.query;

        // Run question fetch and usage aggregation in parallel
        const [questions, usageAgg] = await Promise.all([
            Question.find({}).sort({ createdAt: -1 }).lean(),
            Exam.aggregate([
                { $unwind: "$questions" },
                { $group: { _id: "$questions", usageCount: { $sum: 1 } } }
            ])
        ]);

        const usageMap = {};
        usageAgg.forEach(u => { usageMap[String(u._id)] = u.usageCount; });

        // Format all questions (without decrypting sensitive content for Admins)
        const allDecrypted = questions.map((question) => {
            return {
                _id: question._id,
                title: question.contentHash || "[Encrypted Question Hash]",
                options: [],
                correctAnswerIndex: null,
                difficultyLevel: question.difficultyLevel,
                subject: question.subject,
                topic: question.topic,
                createdBy: question.createdBy,
                createdAt: question.createdAt,
                health: {
                    usageCount: usageMap[String(question._id)] || 0,
                    successRate: 0,
                    flagged: false,
                },
            }
        });

        // Compute global stats and subjects BEFORE filtering
        const stats = {
            total: allDecrypted.length,
            easy: allDecrypted.filter(q => q.difficultyLevel === 'easy').length,
            medium: allDecrypted.filter(q => q.difficultyLevel === 'medium').length,
            hard: allDecrypted.filter(q => q.difficultyLevel === 'hard').length,
            highSuccess: allDecrypted.filter(q => (q.health?.successRate || 0) > 70).length,
            lowSuccess: allDecrypted.filter(q => (q.health?.successRate || 0) < 40).length,
            flagged: allDecrypted.filter(q => q.health?.flagged).length,
        };

        const subjects = [...new Set(allDecrypted.map(q => q.subject).filter(Boolean))];

        // Chart data logic (simplified to return full grouped data)
        const chartDataAll = subjects.map(sub => {
            const subQs = allDecrypted.filter(q => q.subject === sub);
            return {
                name: sub,
                Easy: subQs.filter(q => q.difficultyLevel === 'easy').length,
                Medium: subQs.filter(q => q.difficultyLevel === 'medium').length,
                Hard: subQs.filter(q => q.difficultyLevel === 'hard').length,
            };
        });

        const topicsBySubject = {};
        subjects.forEach(sub => {
            const subQs = allDecrypted.filter(q => q.subject === sub);
            const topics = [...new Set(subQs.map(q => q.topic).filter(Boolean))];
            topicsBySubject[sub] = topics.map(top => {
                const topQs = subQs.filter(q => q.topic === top);
                return {
                    name: top,
                    Easy: topQs.filter(q => q.difficultyLevel === 'easy').length,
                    Medium: topQs.filter(q => q.difficultyLevel === 'medium').length,
                    Hard: topQs.filter(q => q.difficultyLevel === 'hard').length,
                };
            });
        });

        // Apply filters
        const qSearch = search.toLowerCase();
        const filtered = allDecrypted.filter(q => {
            const matchSearch = q.title?.toLowerCase().includes(qSearch) ||
                q.subject?.toLowerCase().includes(qSearch) ||
                q.topic?.toLowerCase().includes(qSearch);
            const matchDiff = !difficulty || q.difficultyLevel === difficulty;
            const matchSub = !subject || q.subject === subject;
            return matchSearch && matchDiff && matchSub;
        });

        // Paginate
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

        return res.status(200).json({
            message: "Questions fetched successfully",
            questions: paginated,
            totalFiltered: filtered.length,
            stats,
            subjects,
            chartDataAll,
            topicsBySubject
        });

    } catch (error) {
        console.error("Error fetching all questions: ", error)
        return res.status(500).json({
            message: "Something went wrong while fetching all questions",
        })
    }
}