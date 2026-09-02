import { Router } from "express";
import { registerStudent, loginStudent, getAvailableExams, getAllStudents, getExamById, submitExamResult, getStudentResults } from "../controllers/student.controllers.js";
import { verifyStudentJWT, verifyAdminJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Routes
router.route("/login").post(loginStudent);

// Admin protected route for registering students
router.route("/register").post(verifyAdminJWT, registerStudent);
router.route("/").get(verifyAdminJWT, getAllStudents);

// Protected Route: Only logged in students can see the exams
router.route("/exams").get(verifyStudentJWT, getAvailableExams);
router.route("/exams/:id").get(verifyStudentJWT, getExamById);

// Protected Route: Only logged in students can submit exam results
router.route("/results")
    .post(verifyStudentJWT, submitExamResult)
    .get(verifyStudentJWT, getStudentResults);

export default router;