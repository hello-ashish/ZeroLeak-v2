import { Router } from "express"
import { loginProfessor } from "../controllers/professor.controllers.js"
import { createBatch, getMyBatches, addQuestionToBatch, submitBatch } from "../controllers/professor.controllers.js"
import { verifyProfessorJWT } from "../middlewares/auth.middleware.js"
const router = Router()

// route to login professor
router.route("/login").post(loginProfessor)

router.route("/batches").post(verifyProfessorJWT, createBatch)
router.route("/batches").get(verifyProfessorJWT, getMyBatches)
router.route("/batches/:batchId/questions").post(verifyProfessorJWT, addQuestionToBatch)
router.route("/batches/:batchId/submit").post(verifyProfessorJWT, submitBatch)

export default router