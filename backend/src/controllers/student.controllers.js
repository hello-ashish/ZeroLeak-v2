import { Student } from "../models/student.models.js"
import { Exam } from "../models/exam.models.js"
import { Result } from "../models/result.models.js";
import { CheatingIncident } from "../models/cheatingIncident.models.js";
import { AuditLog } from "../models/auditlog.models.js";

import {
    decryptQuestionContent,
    verifyQuestionIntegrity,
} from "../Services/crypto.service.js"

import { buildMerkleRoot } from "../Services/merkle.service.js"
import { appendCommitment, canonicalize, sha256 } from "../Services/blockchain.service.js"

// 1. Register Student
export const registerStudent = async (req, res) => {
    try {
        const { studentId, name, email, password, department, batch, contact, dateOfBirth, address, gender, program } = req.body;
        if (!studentId || !name || !email || !password) return res.status(400).json({ message: "All fields required" });
        const existingStudent = await Student.findOne({ $or: [{ studentId }, { email }] });
        if (existingStudent) return res.status(400).json({ message: "Student already exists" });
        
        const studentData = { studentId, name, email, password, department, batch, contact, address, gender, program };
        if (dateOfBirth) studentData.dateOfBirth = dateOfBirth;
        
        const student = await Student.create(studentData);
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
        const { currentExamId, warningCount } = req.body;
        // The verifyStudentJWT middleware will automatically reject this if the student is blocked.
        const student = req.student;
        student.lastActiveAt = new Date();
        if (currentExamId) {
            student.currentExamId = currentExamId;
        }

        // Network Interception Bypass Protection
        // If the client's warning count is >= 3, they might be blocking the /incident endpoint.
        // We enforce termination here as a fallback.
        const MAX_VIOLATIONS = 3;
        if (warningCount >= MAX_VIOLATIONS && currentExamId) {
            const exam = await Exam.findById(currentExamId);
            
            if (exam) {
                // Terminate attempt if not already terminated
                let result = await Result.findOne({ student: student._id, exam: currentExamId, resetByAdmin: { $ne: true } });
                if (!result || !result.isTerminated) {
                    if (result) {
                        result.status = "Terminated";
                        result.isTerminated = true;
                        result.terminationReason = "Auto-terminated via telemetry ping: exceeded maximum security violations.";
                        await result.save();
                    } else {
                        result = await Result.create({
                            student: student._id,
                            exam: currentExamId,
                            score: 0,
                            totalQuestions: exam.questions ? exam.questions.length : 0,
                            status: "Terminated",
                            isTerminated: true,
                            terminationReason: "Auto-terminated via telemetry ping: exceeded maximum security violations."
                        });
                    }
                    
                    // Create an incident record for audit
                    const incident = await CheatingIncident.create({
                        studentId: student._id,
                        examId: currentExamId,
                        attemptId: result._id,
                        violationType: "EXAM_TERMINATION",
                        severity: "Critical",
                        description: "Exam attempt terminated via heartbeat telemetry due to missing incident logs.",
                        detectedAt: new Date(),
                        actionTaken: "STUDENT_BLOCKED",
                        reviewStatus: "Pending"
                    });

                    // Cryptographic Incident Commitment
                    const incidentPayload = canonicalize({
                        incidentId: String(incident._id),
                        studentId: String(student._id),
                        examId: String(currentExamId),
                        violationType: incident.violationType,
                        severity: incident.severity,
                        actionTaken: incident.actionTaken,
                        timestamp: incident.detectedAt
                    });

                    await appendCommitment({
                        blockType: "INCIDENT_COMMITMENT",
                        entityId: incident._id,
                        entityLabel: `Integrity Violation: ${student.email}`,
                        actorId: "SYSTEM",
                        actorRole: "System",
                        metadata: {
                            incidentId: String(incident._id),
                            studentId: String(student._id),
                            examId: String(currentExamId),
                            incidentHash: sha256(JSON.stringify(incidentPayload))
                        }
                    });
                }
                
                // Block the student
                if (!student.isBlocked) {
                    student.isBlocked = true;
                    student.blockedAt = new Date();
                    student.blockedReason = `Exam "${exam.title}" — blocked via telemetry after ${MAX_VIOLATIONS} security violations.`;
                    
                    try {
                        await AuditLog.create({
                            actor: student.email,
                            actorRole: "System",
                            action: "STUDENT_AUTO_BLOCKED",
                            targetType: "Student",
                            targetId: String(student._id),
                            targetLabel: student.name,
                            details: `Student ${student.email} auto-blocked via telemetry on exam "${exam.title}".`,
                            status: "success"
                        });
                    } catch (auditErr) {}
                }
            }
        }

        await student.save();
        
        if (student.isBlocked) {
            return res.status(403).json({ message: "BLOCKED" });
        }
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

        if (exam.questions.length === 0) {
            return res.status(400).json({
                message: "Exam contains no questions."
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

        // Prevent duplicate submissions.
        // Skip results marked resetByAdmin=true — those are audit records for terminated/authorized attempts.
        const existingResult = await Result.findOne({
            student: req.student._id,
            exam: examId,
            resetByAdmin: { $ne: true }
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

        if (exam.questions.length === 0) {
            return res.status(400).json({
                message: "Exam contains no questions."
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

        // Generate Submission Hash & Result Commitment
        const submissionPayload = canonicalize({
            examId: String(examId),
            studentId: String(req.student._id),
            answers: answers.map(a => ({ questionId: String(a.questionId), selectedOptionIndex: a.selectedOptionIndex })),
            timestamp: result.createdAt
        });
        const submissionHash = sha256(JSON.stringify(submissionPayload));

        await appendCommitment({
            blockType: "RESULT_COMMITMENT",
            entityId: result._id,
            entityLabel: `Result for Exam: ${exam.title}`,
            merkleRoot: null,
            actorId: req.student._id,
            actorRole: "Student",
            metadata: {
                examId: String(examId),
                studentId: String(req.student._id),
                resultId: String(result._id),
                score: score,
                totalQuestions: totalQuestions,
                submissionHash: submissionHash // Cryptographically proves the exact answers submitted
            }
        });

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