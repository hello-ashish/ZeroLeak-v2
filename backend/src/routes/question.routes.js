import { Router } from "express"
import { createQuestion, getProfessorQuestions } from "../controllers/question.controllers.js"
import { verifyProfessorJWT } from "../middlewares/auth.middleware.js"

const router = Router()

// Route to create a new question
router.route("/")
.post(verifyProfessorJWT, createQuestion)
.get(verifyProfessorJWT, getProfessorQuestions)

export default router