import { Router } from "express";
import {
    registerAuditor,
    loginAuditor,
    getDashboardMetrics,
    getAuditLogs,
    getAnomalies,
    updateAnomalyStatus,
    scanAnomalies,
    getExams,
    getStudents,
    getProfessors
} from "../controllers/auditor.controllers.js";
import { verifyAuditorJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────
router.route("/register").post(registerAuditor);
router.route("/login").post(loginAuditor);

// ─── Protected Routes (Read-Only & Auditor Specific) ──────────────────────────
router.use(verifyAuditorJWT); // Apply to all below

router.route("/metrics").get(getDashboardMetrics);
router.route("/logs").get(getAuditLogs);

router.route("/anomalies").get(getAnomalies);
router.route("/anomalies/scan").post(scanAnomalies);
router.route("/anomalies/:id/status").patch(updateAnomalyStatus);

// Read-only data for the explorer
router.route("/exams").get(getExams);
router.route("/students").get(getStudents);
router.route("/professors").get(getProfessors);

export default router;
