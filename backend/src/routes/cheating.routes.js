import { Router } from "express";
import {
    recordIncident,
    terminateAttempt,
    getIncidents,
    getBlockedStudents,
    unblockStudent,
    authorizeNewAttempt
} from "../controllers/cheating.controllers.js";
import {
    verifyStudentJWT,
    verifyAdminJWT,
    verifyAdminOrAuditorJWT
} from "../middlewares/auth.middleware.js";

const router = Router();

// Student Protected Routes
router.route("/incident").post(verifyStudentJWT, recordIncident);
router.route("/terminate").post(verifyStudentJWT, terminateAttempt);

// Admin & Auditor Protected Telemetry Routes
router.route("/incidents").get(verifyAdminOrAuditorJWT, getIncidents);
router.route("/blocked-students").get(verifyAdminOrAuditorJWT, getBlockedStudents);

// Admin Only Routes
router.route("/unblock/:studentId").post(verifyAdminJWT, unblockStudent);
// Authorizes a fresh exam attempt for a student whose terminated attempt is blocking them.
// This does NOT delete the old terminated record — it marks it resetByAdmin=true for audit.
router.route("/authorize-attempt/:studentId/:examId").post(verifyAdminJWT, authorizeNewAttempt);

export default router;
