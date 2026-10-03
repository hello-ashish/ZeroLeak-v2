import { Exam } from "../models/exam.models.js";
import { Result } from "../models/result.models.js";
import { buildMerkleRoot } from "./merkle.service.js";
import { decryptQuestionContent, verifyQuestionIntegrity } from "./crypto.service.js";
import { canonicalize, sha256, createCommitment } from "../blockchain/commitment.service.js";

export const startExamExpirationWorker = () => {
    // Run every 30 seconds
    setInterval(async () => {
        try {
            const now = new Date();
            // Find all Live exams where endsAt has passed
            const expiredExams = await Exam.find({
                status: "Live",
                endsAt: { $lt: now }
            }).populate("questions").populate("examinationId");

            for (const exam of expiredExams) {
                // Find all InProgress results for this exam
                const inProgressResults = await Result.find({
                    exam: exam._id,
                    status: "InProgress",
                    resetByAdmin: { $ne: true }
                }).populate("assignedQuestions").populate("student");

                for (const existingResult of inProgressResults) {
                    await finalizeResult(exam, existingResult);
                }

                exam.status = "Completed";
                await exam.save();
                console.log(`[ExamExpiration] Exam ${exam.title} finalized and marked as Completed.`);
            }
        } catch (error) {
            console.error("[ExamExpiration] Error in expiration worker:", error);
        }
    }, 30 * 1000); 
};

const finalizeResult = async (exam, existingResult) => {
    try {
        let examQuestions = exam.questions;
        if (exam.mode === "Zeroleak") {
            examQuestions = existingResult.assignedQuestions;
        }

        if (!examQuestions || examQuestions.length === 0) {
            existingResult.status = "Completed";
            existingResult.score = 0;
            await existingResult.save();
            return;
        }

        const questionHashes = [];
        const decryptedQuestions = [];

        for (const question of examQuestions) {
            if (!question.encryptedContent || !question.contentHash) {
                continue;
            }
            const isValid = verifyQuestionIntegrity(question.encryptedContent, question.contentHash);
            if (!isValid) {
                continue;
            }
            questionHashes.push(question.contentHash);
            const decryptedContent = decryptQuestionContent(question.encryptedContent);
            decryptedQuestions.push({
                id: String(question._id),
                correctAnswerIndex: decryptedContent.correctAnswerIndex
            });
        }

        const answers = existingResult.latestAnswers || [];
        const answerMap = new Map();
        for (const answer of answers) {
            if (!answer || !answer.questionId) continue;
            answerMap.set(String(answer.questionId), answer.selectedOptionIndex);
        }

        let score = 0;
        for (const question of decryptedQuestions) {
            const submittedAnswer = answerMap.get(question.id);
            if (submittedAnswer !== undefined && Number(submittedAnswer) === Number(question.correctAnswerIndex)) {
                score++;
            }
        }

        const totalQuestions = decryptedQuestions.length;
        existingResult.score = score;
        existingResult.totalQuestions = totalQuestions;
        existingResult.status = "Completed";
        const result = await existingResult.save();

        const submissionPayload = canonicalize({
            examId: String(exam._id),
            studentId: String(existingResult.student._id),
            answers: answers.map(a => ({ questionId: String(a.questionId), selectedOptionIndex: a.selectedOptionIndex })),
            timestamp: result.createdAt
        });
        const submissionHash = sha256(JSON.stringify(submissionPayload));

        const commitment = await createCommitment({
            objectType: "Result",
            objectId: result._id,
            commitmentType: "RESULT_AUTO_SUBMIT",
            payload: {
                examId: String(exam._id),
                studentId: String(existingResult.student._id),
                score: score,
                totalQuestions: totalQuestions,
                submissionHash: submissionHash
            }
        });
        result.commitmentId = commitment.eventId;
        result.commitmentHash = commitment.canonicalHash;
        await result.save();
        console.log(`[ExamExpiration] Result ${result._id} auto-finalized`);
    } catch (err) {
        console.error(`[ExamExpiration] Error finalizing result ${existingResult._id}:`, err);
    }
};
