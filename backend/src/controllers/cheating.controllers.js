import mongoose from "mongoose";
import { Student } from "../models/student.models.js";
import { Exam } from "../models/exam.models.js";
import { Result } from "../models/result.models.js";
import { CheatingIncident } from "../models/cheatingIncident.models.js";
import { AuditLog } from "../models/auditlog.models.js";
import { Anomaly } from "../models/anomaly.models.js";

// Helper to check valid ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// 1. Record a cheating incident for the authenticated student's active exam attempt
export const recordIncident = async (req, res) => {
    try {
        const { examId, attemptId, violationType, severity, description, evidenceData, actionTaken } = req.body;
        const student = req.student;

        if (!examId || !violationType || !description) {
            return res.status(400).json({ message: "Exam ID, violation type, and description are required." });
        }

        if (!isValidObjectId(examId)) {
            return res.status(400).json({ message: "Invalid Exam ID format." });
        }

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: "Exam not found." });
        }

        let validAttemptId = null;
        if (attemptId) {
            if (isValidObjectId(attemptId)) {
                const existingResult = await Result.findOne({ _id: attemptId, student: student._id, exam: examId });
                if (existingResult) {
                    validAttemptId = existingResult._id;
                }
            }
        }

        const finalAction = actionTaken || "NONE";

        const incident = await CheatingIncident.create({
            studentId: student._id,
            examId,
            attemptId: validAttemptId,
            violationType,
            severity: severity || "Medium",
            description,
            detectedAt: new Date(),
            actionTaken: finalAction,
            evidenceData: evidenceData || {},
            reviewStatus: "Pending"
        });

        // Auto-block student if action taken is STUDENT_BLOCKED
        if (finalAction === "STUDENT_BLOCKED") {
            const studentDoc = await Student.findById(student._id);
            if (studentDoc) {
                studentDoc.isBlocked = true;
                studentDoc.blockedAt = new Date();
                studentDoc.blockedReason = description || "Blocked due to security policy violations.";
                await studentDoc.save();
            }
        }

        // Log to Anomaly telemetry system as well
        try {
            await Anomaly.create({
                rule: `Security Policy Violation: ${violationType}`,
                description: `Student ${student.name} (${student.email}) triggered ${violationType} during exam ${exam.title}`,
                severity: severity === "Critical" ? "Critical" : severity === "High" ? "High" : "Medium",
                category: "Exam Integrity",
                status: "Open",
                actor: student.email,
                targetType: "Exam",
                targetId: String(exam._id)
            });
        } catch (anomError) {
            console.error("Error creating anomaly log for incident:", anomError.message);
        }

        return res.status(201).json({
            message: "Cheating incident recorded successfully",
            incident
        });
    } catch (error) {
        console.error("Error recording cheating incident:", error);
        return res.status(500).json({ message: "Error recording cheating incident", error: error.message });
    }
};

// 2. Terminate the active exam attempt and record the reason
export const terminateAttempt = async (req, res) => {
    try {
        const { examId, attemptId, reason, autoBlockStudent } = req.body;
        const student = req.student;

        if (!examId) {
            return res.status(400).json({ message: "Exam ID is required." });
        }

        if (!isValidObjectId(examId)) {
            return res.status(400).json({ message: "Invalid Exam ID format." });
        }

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: "Exam not found." });
        }

        // Check for existing result to prevent duplicate termination
        let result = await Result.findOne({ student: student._id, exam: examId });

        if (result) {
            if (result.isTerminated) {
                return res.status(400).json({
                    message: "Exam attempt has already been terminated.",
                    result
                });
            }

            // Update existing result to Terminated status
            result.status = "Terminated";
            result.isTerminated = true;
            result.terminationReason = reason || "Auto-terminated due to cheating violations.";
            await result.save();
        } else {
            // Create a new terminated Result record
            result = await Result.create({
                student: student._id,
                exam: examId,
                score: 0,
                totalQuestions: exam.questions ? exam.questions.length : 0,
                status: "Terminated",
                isTerminated: true,
                terminationReason: reason || "Auto-terminated due to cheating violations."
            });
        }

        let isBlocked = student.isBlocked;

        // Auto-block student on server if requested or rule breached
        if (autoBlockStudent) {
            const studentDoc = await Student.findById(student._id);
            if (studentDoc) {
                studentDoc.isBlocked = true;
                studentDoc.blockedAt = new Date();
                studentDoc.blockedReason = reason || "Blocked due to security policy violations.";
                await studentDoc.save();
                isBlocked = true;
            }
        }

        // Create incident record for this termination
        await CheatingIncident.create({
            studentId: student._id,
            examId,
            attemptId: result._id,
            violationType: "EXAM_TERMINATION",
            severity: "Critical",
            description: reason || "Exam attempt was terminated due to anti-cheating policy violation.",
            detectedAt: new Date(),
            actionTaken: autoBlockStudent ? "STUDENT_BLOCKED" : "EXAM_TERMINATED",
            reviewStatus: "Pending"
        });

        // Audit Log
        try {
            await AuditLog.create({
                actor: student.email,
                actorRole: "System",
                action: "EXAM_ATTEMPT_TERMINATED",
                targetType: "Exam",
                targetId: String(exam._id),
                targetLabel: exam.title,
                details: `Attempt for student ${student.email} was terminated. Reason: ${reason || "Cheating violation"}`,
                status: "success"
            });
        } catch (auditErr) {
            console.error("Error creating audit log:", auditErr.message);
        }

        return res.status(200).json({
            message: "Exam attempt terminated successfully",
            result,
            isBlocked
        });
    } catch (error) {
        console.error("Error terminating exam attempt:", error);
        return res.status(500).json({ message: "Error terminating exam attempt", error: error.message });
    }
};

// 3. Admin / Auditor: Get incidents with pagination and filtering
export const getIncidents = async (req, res) => {
    try {
        const { page = 1, limit = 10, examId, studentId, reviewStatus, violationType, severity } = req.query;

        const query = {};

        if (examId && isValidObjectId(examId)) {
            query.examId = examId;
        }

        if (studentId && isValidObjectId(studentId)) {
            query.studentId = studentId;
        }

        if (reviewStatus) {
            query.reviewStatus = reviewStatus;
        }

        if (violationType) {
            query.violationType = violationType;
        }

        if (severity) {
            query.severity = severity;
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await CheatingIncident.countDocuments(query);

        const incidents = await CheatingIncident.find(query)
            .populate("studentId", "studentId name email department batch")
            .populate("examId", "title durationMinutes")
            .populate("reviewedBy", "email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        return res.status(200).json({
            incidents,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error("Error fetching cheating incidents:", error);
        return res.status(500).json({ message: "Error fetching cheating incidents", error: error.message });
    }
};

// 4. Admin / Auditor: Get blocked students
export const getBlockedStudents = async (req, res) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        const query = { isBlocked: true };

        if (search) {
            const regex = new RegExp(search, "i");
            query.$or = [
                { name: regex },
                { email: regex },
                { studentId: regex }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await Student.countDocuments(query);

        const blockedStudents = await Student.find(query)
            .select("-password")
            .sort({ blockedAt: -1, updatedAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        return res.status(200).json({
            blockedStudents,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error("Error fetching blocked students:", error);
        return res.status(500).json({ message: "Error fetching blocked students", error: error.message });
    }
};

// 5. Admin: Unblock a student
export const unblockStudent = async (req, res) => {
    try {
        const { studentId } = req.params;

        if (!studentId) {
            return res.status(400).json({ message: "Student ID parameter is required." });
        }

        let student = null;
        if (isValidObjectId(studentId)) {
            student = await Student.findById(studentId);
        }

        if (!student) {
            student = await Student.findOne({ studentId: studentId });
        }

        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        student.isBlocked = false;
        student.blockedAt = null;
        student.blockedReason = null;
        await student.save();

        // Update incidents for this student to Dismissed or Reviewed status
        try {
            await CheatingIncident.updateMany(
                { studentId: student._id, reviewStatus: "Pending" },
                { $set: { reviewStatus: "Dismissed", reviewedBy: req.admin._id, reviewedAt: new Date() } }
            );
        } catch (incErr) {
            console.error("Error updating incidents on unblock:", incErr.message);
        }

        // Collect terminated exam attempts for this student (still active, not yet reset)
        // so the admin UI can prompt for an authorized new attempt
        let terminatedExams = [];
        try {
            const terminatedResults = await Result.find({
                student: student._id,
                isTerminated: true,
                resetByAdmin: { $ne: true }
            }).populate("exam", "title _id");

            terminatedExams = terminatedResults.map(r => ({
                resultId: r._id,
                examId: r.exam?._id || r.exam,
                examTitle: r.exam?.title || "Unknown Exam",
                terminationReason: r.terminationReason
            }));
        } catch (tErr) {
            console.error("Error fetching terminated results on unblock:", tErr.message);
        }

        // Audit Log
        try {
            await AuditLog.create({
                actor: req.admin.email,
                actorRole: "Admin",
                action: "STUDENT_UNBLOCKED",
                targetType: "Student",
                targetId: String(student._id),
                targetLabel: student.name,
                details: `Admin ${req.admin.email} unblocked student ${student.name} (${student.email}). Terminated exams pending re-authorization: ${terminatedExams.length}`,
                status: "success"
            });
        } catch (auditErr) {
            console.error("Error creating audit log on unblock:", auditErr.message);
        }

        const updatedStudent = await Student.findById(student._id).select("-password");

        return res.status(200).json({
            message: "Student unblocked successfully",
            student: updatedStudent,
            // List of exams with terminated attempts that still need admin re-authorization
            terminatedExams
        });
    } catch (error) {
        console.error("Error unblocking student:", error);
        return res.status(500).json({ message: "Error unblocking student", error: error.message });
    }
};

// 6. Admin: Authorize a fresh exam attempt for an unblocked student
// The old terminated Result is preserved (audit trail) but marked resetByAdmin=true
// so eligibility checks skip it and the student can submit a new Result.
export const authorizeNewAttempt = async (req, res) => {
    try {
        const { studentId, examId } = req.params;

        if (!studentId || !examId) {
            return res.status(400).json({ message: "Student ID and Exam ID are required." });
        }

        if (!isValidObjectId(studentId) || !isValidObjectId(examId)) {
            return res.status(400).json({ message: "Invalid Student ID or Exam ID format." });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }

        // Safety check: student must be unblocked before authorizing a new attempt
        if (student.isBlocked) {
            return res.status(400).json({
                message: "Student is still blocked. Please unblock the student first before authorizing a new attempt."
            });
        }

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: "Exam not found." });
        }

        // Find the terminated result to reset
        const terminatedResult = await Result.findOne({
            student: studentId,
            exam: examId,
            isTerminated: true,
            resetByAdmin: { $ne: true }  // don't re-reset already authorized ones
        });

        if (!terminatedResult) {
            return res.status(404).json({
                message: "No active terminated attempt found for this student and exam. It may have already been authorized or was never terminated."
            });
        }

        // Mark the terminated result as reset by admin — preserves audit record
        terminatedResult.resetByAdmin = true;
        terminatedResult.resetByAdminAt = new Date();
        await terminatedResult.save();

        // Log the authorization
        try {
            await AuditLog.create({
                actor: req.admin.email,
                actorRole: "Admin",
                action: "NEW_ATTEMPT_AUTHORIZED",
                targetType: "Exam",
                targetId: String(exam._id),
                targetLabel: exam.title,
                details: `Admin ${req.admin.email} authorized a fresh attempt for student ${student.name} (${student.email}) on exam "${exam.title}". Previous terminated result ID: ${terminatedResult._id}`,
                status: "success"
            });
        } catch (auditErr) {
            console.error("Error creating audit log for new attempt authorization:", auditErr.message);
        }

        return res.status(200).json({
            message: `New exam attempt authorized for ${student.name} on "${exam.title}". The student can now retake the exam.`,
            authorizedResultId: terminatedResult._id,
            studentId: student._id,
            examId: exam._id
        });
    } catch (error) {
        console.error("Error authorizing new attempt:", error);
        return res.status(500).json({ message: "Error authorizing new attempt", error: error.message });
    }
};
