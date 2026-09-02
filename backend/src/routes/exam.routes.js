import { Router } from "express"
import { verifyProfessorJWT } from "../middlewares/auth.middleware.js"
import { createExam, getProfessorExams, getProfessorExamResults } from "../controllers/exam.controllers.js"

const router = Router()

router.route("/")
    .post(verifyProfessorJWT, createExam)
    .get(verifyProfessorJWT, getProfessorExams)

router.route("/results").get(verifyProfessorJWT, getProfessorExamResults)
export default router