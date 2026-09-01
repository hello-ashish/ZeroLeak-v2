import { Router } from "express";
import { registerStudent, loginStudent, getAvailableExams, getAllStudents } from "../controllers/student.controllers.js";
import { verifyStudentJWT, verifyAdminJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Routes
router.route("/register").post(verifyAdminJWT, registerStudent);
router.route("/login").post(loginStudent);

// Protected Route: Only logged in students can see the exams
router.route("/exams").get(verifyStudentJWT, getAvailableExams);
router.route("/").get(verifyAdminJWT, getAllStudents);

export default router;