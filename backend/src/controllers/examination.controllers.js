import { Examination } from "../models/examination.models.js";
import { Exam } from "../models/exam.models.js";
import { Question } from "../models/question.models.js";
import { buildMerkleRoot } from "../Services/merkle.service.js";
import { createCommitment } from "../blockchain/commitment.service.js";
import mongoose from "mongoose";
import crypto from "crypto";
import { selectQuestionsByDifficultyRatio } from "../Services/question.service.js";

export const createExamination = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { title, description, subjects, mode } = req.body;

        if (!title || !description || !subjects || subjects.length === 0) {
            return res.status(400).json({ message: "Title, description, and at least one subject are required." });
        }
        
        const examMode = mode === "Zeroleak" ? "Zeroleak" : "Normal";

        // 1. Create Examination
        const examination = new Examination({
            title,
            description,
            createdBy: req.admin?._id || req.user?._id, // Depends on auth middleware
        });
        await examination.save({ session });

        const createdExams = [];

        // 2. Generate an Exam for each Subject
        for (const subj of subjects) {
            const { subject, numQuestions, durationMinutes, passingPercentage } = subj;

            let questionIds = [];
            let questionMerkleRoot = null;

            if (examMode === "Normal") {
                // Randomly select questions using difficulty ratio rules
                const allQuestions = await Question.find({ subject: subject }).session(session);
                
                const selectedQuestions = selectQuestionsByDifficultyRatio(allQuestions, Number(numQuestions) || 10);

                if (selectedQuestions.length === 0) {
                    throw new Error(`No questions available in the question bank for subject: ${subject}`);
                }

                const questionHashes = selectedQuestions.map(q => q.contentHash);
                questionIds = selectedQuestions.map(q => q._id);
                questionMerkleRoot = buildMerkleRoot(questionHashes);
            }

            const exam = new Exam({
                title: `${title} - ${subject}`,
                description: `${subject} section for ${title}`,
                durationMinutes: durationMinutes || 60,
                passingPercentage: passingPercentage || 50,
                status: "Draft",
                createdBy: req.admin?._id || req.user?._id,
                examinationId: examination._id,
                subject: subject,
                mode: examMode,
                zeroleakConfig: examMode === "Zeroleak" ? { numQuestions: Number(numQuestions) || 10 } : { numQuestions: 0 },
                questions: questionIds,
                questionMerkleRoot
            });

            await exam.save({ session });

            // Blockchain Commitment
            try {
                const commitment = await createCommitment({
                    objectType: "Exam",
                    objectId: exam._id,
                    commitmentType: "EXAM_VERSION",
                    payload: {
                        title: exam.title,
                        description: exam.description,
                        durationMinutes: exam.durationMinutes,
                        questionCount: exam.questions.length,
                        questionMerkleRoot,
                        actorId: req.admin?._id || req.user?._id,
                    }
                });
                exam.commitmentId = commitment.eventId;
                exam.commitmentHash = commitment.canonicalHash;
                await exam.save({ session });
            } catch (blockchainError) {
                throw new Error(`Blockchain commitment failed for ${subject}: ${blockchainError.message}`);
            }

            createdExams.push(exam);
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            message: "Examination created successfully",
            examination,
            exams: createdExams
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error creating examination: ", error);
        return res.status(500).json({ message: error.message || "Internal server error while creating examination" });
    }
};

export const getExaminations = async (req, res) => {
    try {
        const examinations = await Examination.find({}).sort({ createdAt: -1 }).lean();
        
        // Populate child exams for each examination
        const examinationIds = examinations.map(e => e._id);
        const childExams = await Exam.find({ examinationId: { $in: examinationIds } }).lean();

        const examsByExamination = {};
        childExams.forEach(exam => {
            if (!examsByExamination[exam.examinationId]) {
                examsByExamination[exam.examinationId] = [];
            }
            examsByExamination[exam.examinationId].push(exam);
        });

        const enrichedExaminations = examinations.map(exam => ({
            ...exam,
            subjects: examsByExamination[exam._id] || []
        }));

        return res.status(200).json({
            message: "Examinations fetched successfully",
            examinations: enrichedExaminations
        });

    } catch (error) {
        console.error("Error fetching examinations: ", error);
        return res.status(500).json({ message: "Something went wrong while fetching examinations" });
    }
};

export const updateExaminationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const examination = await Examination.findByIdAndUpdate(id, { status }, { new: true });
        if (!examination) return res.status(404).json({ message: "Examination not found" });

        return res.status(200).json({ message: "Status updated successfully", examination });
    } catch (error) {
        console.error("Error updating examination status:", error);
        return res.status(500).json({ message: "Failed to update status" });
    }
};

export const toggleExaminationResults = async (req, res) => {
    try {
        const { id } = req.params;
        const { isResultReleased } = req.body;
        
        const examination = await Examination.findByIdAndUpdate(id, { isResultReleased }, { new: true });
        if (!examination) return res.status(404).json({ message: "Examination not found" });

        return res.status(200).json({ message: "Results release toggled", examination });
    } catch (error) {
        console.error("Error toggling results:", error);
        return res.status(500).json({ message: "Failed to toggle results" });
    }
};

export const deleteExamination = async (req, res) => {
    try {
        const { id } = req.params;
        
        const examination = await Examination.findById(id);
        if (!examination) return res.status(404).json({ message: "Examination not found" });

        // Delete child exams
        await Exam.deleteMany({ examinationId: id });
        
        // Delete examination
        await Examination.findByIdAndDelete(id);

        return res.status(200).json({ message: "Examination deleted successfully" });
    } catch (error) {
        console.error("Error deleting examination:", error);
        return res.status(500).json({ message: "Failed to delete examination" });
    }
};
