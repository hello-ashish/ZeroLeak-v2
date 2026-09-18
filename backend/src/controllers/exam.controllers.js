import { Exam } from "../models/exam.models.js";
import { Result } from "../models/result.models.js";
import { Question } from "../models/question.models.js";
import { buildMerkleRoot } from "../Services/merkle.service.js";
import { appendCommitment } from "../Services/blockchain.service.js";

export const createExam = async (req, res) => {
    try {
        const {
            title,
            description,
            duration,
            questions
        } = req.body;

        if (
            !title ||
            !description ||
            !questions ||
            questions.length === 0
        ) {
            return res.status(400).json({
                message:
                    "Title, description, and at least one question are required."
            });
        }

        // Fetch selected questions from the database
        const questionDocs = await Question.find({
            _id: { $in: questions }
        }).select("encryptedContent contentHash");

        // Create a map so the original question order is preserved
        const questionMap = new Map(
            questionDocs.map((question) => [
                String(question._id),
                question
            ])
        );

        const orderedQuestions = questions.map(
            (questionId) =>
                questionMap.get(String(questionId))
        );

        // Every selected question must exist
        if (
            orderedQuestions.some(
                (question) => !question
            )
        ) {
            return res.status(400).json({
                message:
                    "One or more selected questions do not exist."
            });
        }

        // Only encrypted questions are allowed
        const hasUnencryptedQuestion =
            orderedQuestions.some(
                (question) =>
                    !question.encryptedContent
            );

        if (hasUnencryptedQuestion) {
            return res.status(400).json({
                message:
                    "Exam can only contain encrypted questions."
            });
        }

        // Collect SHA-256 question hashes
        const questionHashes =
            orderedQuestions.map(
                (question) =>
                    question.contentHash
            );

        // Validate every hash
        const hasInvalidHash =
            questionHashes.some(
                (hash) =>
                    typeof hash !== "string" ||
                    !/^[a-fA-F0-9]{64}$/.test(hash)
            );

        if (hasInvalidHash) {
            return res.status(400).json({
                message:
                    "One or more questions have an invalid integrity hash."
            });
        }

        // Build Merkle root
        const questionMerkleRoot =
            buildMerkleRoot(questionHashes);

        // Create protected exam
        const exam = await Exam.create({
            title,
            description,
            durationMinutes:
                duration || 60,
            createdBy: req.admin._id,
            questions,
            questionMerkleRoot
        });

        try {
            const blockchainBlock = await appendCommitment({
                blockType: "EXAM_COMMITMENT",
                entityId: exam._id,
                entityLabel: title,
                merkleRoot: questionMerkleRoot,
                actorId: req.admin?._id,
                actorRole: "Admin",
                metadata: {
                    examId: String(exam._id),
                    questionCount: questions.length,
                    durationMinutes: duration || 60,
                    status: "Draft",
                },
            });
            exam.blockchainBlockIndex = blockchainBlock.blockIndex;
            exam.blockchainBlockHash = blockchainBlock.hash;
            await exam.save();
        } catch (blockchainError) {
            await Exam.deleteOne({ _id: exam._id });
            throw new Error(`Exam creation rolled back: blockchain commitment failed (${blockchainError.message})`);
        }

        return res.status(201).json({
            message:
                "Exam created successfully",
            exam
        });

    } catch (error) {
        console.error(
            "Error creating exam: ",
            error
        );

        return res.status(500).json({
            message:
                "Internal server error while creating exam"
        });
    }
};

export const getExams = async (req, res) => {
    try {
        const exams = await Exam.find({})
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message:
                "Exams fetched successfully",
            exams
        });

    } catch (error) {
        console.error(
            "Error fetching exams: ",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while fetching exams"
        });
    }
};

export const getExamResults = async (req, res) => {
    try {
        const results = await Result.find({})
            .populate(
                "student",
                "name studentId"
            )
            .populate(
                "exam",
                "title"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message:
                "Results fetched successfully",
            results
        });

    } catch (error) {
        console.error(
            "Error fetching results: ",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong while fetching results"
        });
    }
};
export const bulkDeleteResults = async (req, res) => {
    try {
        const { resultIds } = req.body;
        
        if (!resultIds || !Array.isArray(resultIds) || resultIds.length === 0) {
            return res.status(400).json({
                message: "No result IDs provided for deletion"
            });
        }
        
        await Result.deleteMany({ _id: { $in: resultIds } });
        
        return res.status(200).json({
            message: "Results deleted successfully"
        });
        
    } catch (error) {
        console.error(
            "Error bulk deleting results: ",
            error
        );
        
        return res.status(500).json({
            message: "Something went wrong while deleting results"
        });
    }
};
