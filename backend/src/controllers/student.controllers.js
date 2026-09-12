import { Student } from "../models/student.models.js"
import { Exam } from "../models/exam.models.js"
import { Result } from "../models/result.models.js";

import {
    decryptQuestionContent,
    verifyQuestionIntegrity,
} from "../Services/crypto.service.js"

import { buildMerkleRoot } from "../Services/merkle.service.js"

// 1. Register Student
export const registerStudent = async (req, res) => {
    try {
        const { studentId, name, email, password } = req.body;
        if (!studentId || !name || !email || !password) return res.status(400).json({ message: "All fields required" });
        const existingStudent = await Student.findOne({ $or: [{ studentId }, { email }] });
        if (existingStudent) return res.status(400).json({ message: "Student already exists" });
        const student = await Student.create({ studentId, name, email, password });
        const createdStudent = await Student.findById(student._id).select("-password");
        return res.status(201).json({ message: "Student registered", student: createdStudent });
    } catch (error) {
        return res.status(500).json({ message: "Error registering student", error: error.message });
    }
}

// 2. Login Student
export const loginStudent = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password required" });
        const student = await Student.findOne({ email });
        if (!student) return res.status(404).json({ message: "Student not found" });
        if (student.isBlocked) return res.status(403).json({ message: "Your account has been restricted by an administrator." });
        
        const isPasswordValid = await student.isPasswordCorrect(password);
        if (!isPasswordValid) return res.status(401).json({ message: "Invalid credentials" });
        const token = student.generateAccessToken();
        const loggedInStudent = await Student.findById(student._id).select("-password");
        return res.status(200).json({ message: "Login successful", token, student: loggedInStudent });
    } catch (error) {
        return res.status(500).json({ message: "Error logging in", error: error.message });
    }
}

// 2b. Ping Session (Live tracking)
export const pingSession = async (req, res) => {
    try {
        const { currentExamId } = req.body;
        // The verifyStudentJWT middleware will automatically reject this if the student is blocked.
        const student = req.student;
        student.lastActiveAt = new Date();
        if (currentExamId) {
            student.currentExamId = currentExamId;
        }
        await student.save();
        return res.status(200).json({ message: "Ping successful" });
    } catch (error) {
        return res.status(500).json({ message: "Error pinging session", error: error.message });
    }
}

// 3. Get all available Exams for Students to see!
export const getAvailableExams = async (req, res) => {
    try {
        // We fetch ALL exams, and we use .populate to inject the Admin's email into the "createdBy" field!
        const exams = await Exam.find().populate("createdBy", "email").sort({ createdAt: -1 });
        return res.status(200).json({ exams });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching exams", error: error.message });
    }
}

// 4. Fetch all students (for Admins only)
export const getAllStudents = async (req, res) => {
    try {
        const students = await Student.find().select("-password").sort({ createdAt: -1 });
        return res.status(200).json({ students });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching students", error: error.message });
    }
}

// 5. Fetch a single exam by its id
export const getExamById = async (req, res) => {
    try {
        const { id } = req.params

        const exam = await Exam.findById(id)
            .populate("createdBy", "email")
            .populate("questions")

        if (!exam) {
            return res.status(404).json({
                message: "Exam not found"
            })
        }

        // Protected exams must have a Merkle root
        if (!exam.questionMerkleRoot) {
            return res.status(403).json({
                message:
                    "This exam is not protected and cannot be accessed."
            })
        }

        const questionHashes = []
        const safeQuestions = []

        for (const question of exam.questions) {

            // Every question must contain encrypted content
            if (
                !question.encryptedContent ||
                !question.contentHash
            ) {
                return res.status(403).json({
                    message:
                        "Exam integrity verification failed."
                })
            }

            // Verify individual question integrity
            const isValid = verifyQuestionIntegrity(
                question.encryptedContent,
                question.contentHash
            )

            if (!isValid) {
                console.error(
                    `Integrity check failed for question ${question._id}`
                )

                return res.status(403).json({
                    message:
                        "Question integrity verification failed."
                })
            }

            questionHashes.push(
                question.contentHash
            )

            // Decrypt only after integrity verification
            const decryptedContent =
                decryptQuestionContent(
                    question.encryptedContent
                )

            // Never send the correct answer to the student
            safeQuestions.push({
                _id: question._id,
                title: decryptedContent.title,
                options: decryptedContent.options,
                difficultyLevel:
                    question.difficultyLevel,
                subject: question.subject,
                topic: question.topic,
            })
        }

        // Rebuild the Merkle root
        const calculatedMerkleRoot =
            buildMerkleRoot(questionHashes)

        // Verify the complete exam
        if (
            calculatedMerkleRoot !==
            exam.questionMerkleRoot
        ) {
            console.error(
                "Exam Merkle root verification failed."
            )

            return res.status(403).json({
                message:
                    "Exam integrity verification failed."
            })
        }

        // Convert mongoose document to plain object
        const safeExam = exam.toObject()

        // Replace protected questions with safe questions
        safeExam.questions = safeQuestions

        // Never expose the stored Merkle implementation details
        // to the student unnecessarily
        delete safeExam.questionMerkleRoot

        return res.status(200).json({
            exam: safeExam
        })

    } catch (error) {
        console.error(
            "Error fetching exam: ",
            error
        )

        return res.status(500).json({
            message:
                "Error fetching exam"
        })
    }
}

// 6. Save exam score to the database
export const submitExamResult = async (req, res) => {
    try {
        const {
            examId,
            answers
        } = req.body

        if (
            !examId ||
            !Array.isArray(answers)
        ) {
            return res.status(400).json({
                message:
                    "Exam ID and answers are required."
            })
        }

        // Prevent duplicate submissions
        const existingResult = await Result.findOne({
            student: req.student._id,
            exam: examId
        })

        if (existingResult) {
            return res.status(400).json({
                message:
                    "You have already submitted this exam."
            })
        }

        // Load exam and its protected questions
        const exam = await Exam.findById(examId)
            .populate("questions")

        if (!exam) {
            return res.status(404).json({
                message: "Exam not found."
            })
        }

        // Protected exams must contain a Merkle root
        if (!exam.questionMerkleRoot) {
            return res.status(403).json({
                message:
                    "This exam is not protected."
            })
        }

        const questionHashes = []
        const decryptedQuestions = []

        // Verify and decrypt every question
        for (const question of exam.questions) {

            if (
                !question.encryptedContent ||
                !question.contentHash
            ) {
                return res.status(403).json({
                    message:
                        "Exam integrity verification failed."
                })
            }

            const isValid =
                verifyQuestionIntegrity(
                    question.encryptedContent,
                    question.contentHash
                )

            if (!isValid) {
                console.error(
                    `Question integrity failed during submission: ${question._id}`
                )

                return res.status(403).json({
                    message:
                        "Question integrity verification failed."
                })
            }

            questionHashes.push(
                question.contentHash
            )

            const decryptedContent =
                decryptQuestionContent(
                    question.encryptedContent
                )

            decryptedQuestions.push({
                id: String(question._id),
                correctAnswerIndex:
                    decryptedContent.correctAnswerIndex
            })
        }

        // Rebuild and verify Merkle root
        const calculatedMerkleRoot =
            buildMerkleRoot(questionHashes)

        if (
            calculatedMerkleRoot !==
            exam.questionMerkleRoot
        ) {
            console.error(
                "Exam Merkle root verification failed during submission."
            )

            return res.status(403).json({
                message:
                    "Exam integrity verification failed."
            })
        }

        // Create a lookup map for submitted answers
        const answerMap = new Map()

        for (const answer of answers) {
            if (
                !answer ||
                !answer.questionId
            ) {
                continue
            }

            answerMap.set(
                String(answer.questionId),
                answer.selectedOptionIndex
            )
        }

        // Calculate score on the server
        let score = 0

        for (const question of decryptedQuestions) {
            const submittedAnswer =
                answerMap.get(question.id)

            if (
                submittedAnswer !== undefined &&
                Number(submittedAnswer) ===
                Number(question.correctAnswerIndex)
            ) {
                score++
            }
        }

        const totalQuestions =
            decryptedQuestions.length

        const result = await Result.create({
            student: req.student._id,
            exam: examId,
            score,
            totalQuestions
        })

        return res.status(201).json({
            message:
                "Exam submitted successfully.",
            result
        })

    } catch (error) {
        console.error(
            "Error submitting exam: ",
            error
        )

        return res.status(500).json({
            message:
                "Error submitting exam",
        })
    }
}

// 7. Fetch all results for the logged-in student
export const getStudentResults = async (req, res) => {
    try {
        const results = await Result.find({ student: req.student._id })
            .populate("exam", "title")
            .sort({ createdAt: -1 })
        return res.status(200).json({ results })
    } catch (error) {
        return res.status(500).json({ message: "Error fetching results", error: error.message })
    }
}

// 8. Update Student Profile
export const updateStudentProfile = async (req, res) => {
    try {
        const { name, email, password } = req.body
        const student = await Student.findById(req.student._id)

        if (name) student.name = name
        if (email) student.email = email
        if (password) student.password = password

        await student.save()

        const updatedStudent = await Student.findById(student._id).select("-password")
        return res.status(200).json({
            message: "profile updated successfully", student: updatedStudent
        })
    } catch (error) {
        return res.status(500).json({
            message: "Error updating profile", error: error.message
        })
    }
}

// 9. Change Student Password
export const changeStudentPassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body
        const student = await Student.findById(req.student._id)

        const isPasswordCorrect = await student.isPasswordCorrect(oldPassword)
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Incorrect current password" })
        }

        student.password = newPassword
        await student.save()

        return res.status(200).json({ message: "Password updated successfully" })
    } catch (error) {
        return res.status(500).json({ message: "Error changing password", error: error.message })
    }
}