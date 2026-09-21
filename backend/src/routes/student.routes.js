import { Router } from "express";
import { registerStudent, loginStudent, logoutStudent, getAvailableExams, getAllStudents, getExamById, startExam, submitExamResult, getStudentResults, updateStudentProfile, changeStudentPassword, pingSession } from "../controllers/student.controllers.js";
import { verifyStudentJWT, verifyAdminJWT } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// Public Routes
router.route("/login").post(authLimiter, loginStudent);
router.route("/logout").post(logoutStudent);

// Admin protected route for registering students
router.route("/register").post(verifyAdminJWT, authLimiter, registerStudent);
router.route("/").get(verifyAdminJWT, getAllStudents);

// Protected Route: Only logged in students can see the exams
router.route("/ping").post(verifyStudentJWT, pingSession);
router.route("/exams").get(verifyStudentJWT, getAvailableExams);
router.route("/exams/:id").get(verifyStudentJWT, getExamById);
router.route("/exams/:id/start").post(verifyStudentJWT, startExam);
router.route("/profile").put(verifyStudentJWT, updateStudentProfile)
router.route("/change-password").put(verifyStudentJWT, changeStudentPassword)

// Protected Route: Only logged in students can submit exam results
router.route("/results")
    .post(verifyStudentJWT, submitExamResult)
    .get(verifyStudentJWT, getStudentResults);

export default router;