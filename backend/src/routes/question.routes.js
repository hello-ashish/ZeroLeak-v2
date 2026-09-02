import { Router } from "express"
import { createQuestion, getProfessorQuestions, getAllQuestions } from "../controllers/question.controllers.js"
import { verifyProfessorJWT, verifyAdminJWT } from "../middlewares/auth.middleware.js"

const router = Router()

// Route to create a new question (Professor)
// Route to get all questions (Admin)
router.route("/")
.post(verifyProfessorJWT, createQuestion)
.get(verifyAdminJWT, getAllQuestions)

export default router