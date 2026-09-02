import { Router } from "express";
import { createExam, getExams, getExamResults } from "../controllers/exam.controllers.js";
import { verifyAdminJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Route to create a new exam
router.route("/")
    .post(verifyAdminJWT, createExam)
    .get(verifyAdminJWT, getExams);

// Route to get all student results
router.route("/results")
    .get(verifyAdminJWT, getExamResults);

export default router;
