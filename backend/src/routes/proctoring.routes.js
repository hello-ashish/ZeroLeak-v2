import { Router } from "express";
import {
    getActiveSessions,
    getSessionDetail,
    getExamSessions,
    getStudentIncidents,
    getAllIncidents,
    endSession,
    getActiveExams
} from "../controllers/proctoring.controllers.js";
import { verifyAdminJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes are strictly Admin-only
router.use(verifyAdminJWT);

// GET /api/admin/proctoring/sessions - List active sessions
router.route("/sessions").get(getActiveSessions);

// GET /api/admin/proctoring/sessions/:sessionId - Get specific session details
router.route("/sessions/:sessionId").get(getSessionDetail);

// GET /api/admin/proctoring/exams/:examId/sessions - Get sessions by exam
router.route("/exams/:examId/sessions").get(getExamSessions);

// GET /api/admin/proctoring/students/:studentId/incidents - Get student incidents
router.route("/students/:studentId/incidents").get(getStudentIncidents);

// GET /api/admin/proctoring/incidents - List all incidents
router.route("/incidents").get(getAllIncidents);

// POST /api/admin/proctoring/sessions/:sessionId/end - Manually end a session
router.route("/sessions/:sessionId/end").post(endSession);

// GET /api/admin/proctoring/active-exams - List exams with active sessions
router.route("/active-exams").get(getActiveExams);

export default router;
