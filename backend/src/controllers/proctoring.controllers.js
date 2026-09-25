import mongoose from "mongoose";
import { ProctoringSession } from "../models/proctoringSession.models.js";
import { ProctoringIncident } from "../models/proctoringIncident.models.js";
import { Exam } from "../models/exam.models.js";
import { Student } from "../models/student.models.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── GET /api/admin/proctoring/sessions ──────────────────────────────────
// Returns all active proctoring sessions (Admin only)
export const getActiveSessions = async (req, res) => {
    try {
        const { examId, status } = req.query;
        const filter = {};

        if (examId && isValidObjectId(examId)) {
            filter.examId = examId;
        }

        if (status) {
            filter.status = status;
        } else {
            // Default: show non-ended sessions
            filter.status = { $in: ["INITIALIZING", "ACTIVE", "PAUSED", "DISCONNECTED"] };
        }

        const sessions = await ProctoringSession.find(filter)
            .populate("studentId", "name email studentId department batch")
            .populate("examId", "title subject status")
            .sort({ startedAt: -1 })
            .lean();

        // Compute live connection status from heartbeat
        const now = Date.now();
        const enrichedSessions = sessions.map(session => {
            let connectionStatus = session.connectionStatus;
            if (session.status === "ACTIVE" && session.lastHeartbeat) {
                const elapsed = now - new Date(session.lastHeartbeat).getTime();
                if (elapsed < 15000) connectionStatus = "ONLINE";
                else if (elapsed < 30000) connectionStatus = "UNSTABLE";
                else connectionStatus = "OFFLINE";
            }
            return { ...session, connectionStatus };
        });

        // Summary stats
        const summary = {
            total: enrichedSessions.length,
            online: enrichedSessions.filter(s => s.connectionStatus === "ONLINE").length,
            unstable: enrichedSessions.filter(s => s.connectionStatus === "UNSTABLE").length,
            offline: enrichedSessions.filter(s => s.connectionStatus === "OFFLINE").length,
            pendingIncidents: await ProctoringIncident.countDocuments({
                reviewStatus: "PENDING_REVIEW",
                ...(examId ? { examId } : {})
            }),
        };

        return res.status(200).json({ sessions: enrichedSessions, summary });
    } catch (error) {
        console.error("[PROCTORING] Error fetching active sessions:", error);
        return res.status(500).json({ message: "Failed to fetch proctoring sessions" });
    }
};

// ─── GET /api/admin/proctoring/sessions/:sessionId ───────────────────────
// Returns detailed info for a single session (Admin only)
export const getSessionDetail = async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!isValidObjectId(sessionId)) {
            return res.status(400).json({ message: "Invalid session ID format" });
        }

        const session = await ProctoringSession.findById(sessionId)
            .populate("studentId", "name email studentId department batch")
            .populate("examId", "title subject status durationMinutes")
            .lean();

        if (!session) {
            return res.status(404).json({ message: "Proctoring session not found" });
        }

        return res.status(200).json({ session });
    } catch (error) {
        console.error("[PROCTORING] Error fetching session detail:", error);
        return res.status(500).json({ message: "Failed to fetch session detail" });
    }
};

// ─── GET /api/admin/proctoring/exams/:examId/sessions ────────────────────
// Returns all sessions for a specific exam (Admin only)
export const getExamSessions = async (req, res) => {
    try {
        const { examId } = req.params;
        if (!isValidObjectId(examId)) {
            return res.status(400).json({ message: "Invalid exam ID format" });
        }

        const sessions = await ProctoringSession.find({ examId })
            .populate("studentId", "name email studentId department batch")
            .populate("examId", "title subject status")
            .sort({ startedAt: -1 })
            .lean();

        return res.status(200).json({ sessions });
    } catch (error) {
        console.error("[PROCTORING] Error fetching exam sessions:", error);
        return res.status(500).json({ message: "Failed to fetch exam sessions" });
    }
};

// ─── GET /api/admin/proctoring/students/:studentId/incidents ─────────────
// Returns all proctoring incidents for a student (Admin only)
export const getStudentIncidents = async (req, res) => {
    try {
        const { studentId } = req.params;
        if (!isValidObjectId(studentId)) {
            return res.status(400).json({ message: "Invalid student ID format" });
        }

        const { examId, sessionId } = req.query;
        const filter = { studentId };

        if (examId && isValidObjectId(examId)) filter.examId = examId;
        if (sessionId && isValidObjectId(sessionId)) filter.proctoringSessionId = sessionId;

        const incidents = await ProctoringIncident.find(filter)
            .populate("examId", "title subject")
            .populate("proctoringSessionId", "status startedAt endedAt")
            .sort({ timestamp: -1 })
            .lean();

        return res.status(200).json({ incidents });
    } catch (error) {
        console.error("[PROCTORING] Error fetching student incidents:", error);
        return res.status(500).json({ message: "Failed to fetch incidents" });
    }
};

// ─── GET /api/admin/proctoring/incidents ─────────────────────────────────
// Returns all proctoring incidents with optional filters (Admin only)
export const getAllIncidents = async (req, res) => {
    try {
        const { examId, reviewStatus, severity, limit = 50 } = req.query;
        const filter = {};

        if (examId && isValidObjectId(examId)) filter.examId = examId;
        if (reviewStatus) filter.reviewStatus = reviewStatus;
        if (severity) filter.severity = severity;

        const incidents = await ProctoringIncident.find(filter)
            .populate("studentId", "name email studentId")
            .populate("examId", "title subject")
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .lean();

        return res.status(200).json({ incidents });
    } catch (error) {
        console.error("[PROCTORING] Error fetching all incidents:", error);
        return res.status(500).json({ message: "Failed to fetch incidents" });
    }
};

// ─── POST /api/admin/proctoring/sessions/:sessionId/end ──────────────────
// Admin manually ends a proctoring session (Admin only)
export const endSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!isValidObjectId(sessionId)) {
            return res.status(400).json({ message: "Invalid session ID format" });
        }

        const session = await ProctoringSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: "Proctoring session not found" });
        }

        if (session.status === "ENDED") {
            return res.status(409).json({ message: "Session already ended" });
        }

        session.status = "ENDED";
        session.endedAt = new Date();
        session.connectionStatus = "OFFLINE";
        await session.save();

        console.log(`[PROCTORING] Session ${sessionId} manually ended by Admin`);

        return res.status(200).json({ message: "Session ended successfully", session });
    } catch (error) {
        console.error("[PROCTORING] Error ending session:", error);
        return res.status(500).json({ message: "Failed to end session" });
    }
};

// ─── GET /api/admin/proctoring/active-exams ──────────────────────────────
// Returns list of exams that currently have active proctoring sessions
export const getActiveExams = async (req, res) => {
    try {
        const activeExamIds = await ProctoringSession.distinct("examId", {
            status: { $in: ["INITIALIZING", "ACTIVE", "PAUSED", "DISCONNECTED"] }
        });

        const exams = await Exam.find({ _id: { $in: activeExamIds } })
            .select("title subject status scheduledAt")
            .lean();

        // Count sessions per exam
        const examCounts = await ProctoringSession.aggregate([
            { $match: { status: { $in: ["INITIALIZING", "ACTIVE", "PAUSED", "DISCONNECTED"] } } },
            { $group: { _id: "$examId", count: { $sum: 1 } } }
        ]);

        const countMap = {};
        examCounts.forEach(ec => { countMap[ec._id.toString()] = ec.count; });

        const enrichedExams = exams.map(exam => ({
            ...exam,
            activeStudentCount: countMap[exam._id.toString()] || 0
        }));

        return res.status(200).json({ exams: enrichedExams });
    } catch (error) {
        console.error("[PROCTORING] Error fetching active exams:", error);
        return res.status(500).json({ message: "Failed to fetch active exams" });
    }
};
