import express, { Router } from "express"
import { loginProfessor, logoutProfessor } from "../controllers/professor.controllers.js"
import { createBatch, getMyBatches, addQuestionToBatch, bulkAddQuestionsToBatch, editQuestionInBatch, deleteQuestionFromBatch, submitBatch, updateProfessorProfile, changeProfessorPassword, deleteBatch } from "../controllers/professor.controllers.js"
import { authLimiter } from "../middlewares/rateLimiter.middleware.js"
import { verifyProfessorJWT } from "../middlewares/auth.middleware.js"
const router = Router()
const bulkParser = express.json({ limit: "50mb" })

// route to login professor
router.route("/login").post(authLimiter, loginProfessor)
router.route("/logout").post(logoutProfessor)

router.route("/profile").put(verifyProfessorJWT, updateProfessorProfile)
router.route("/change-password").put(verifyProfessorJWT, changeProfessorPassword)
router.route("/batches").post(verifyProfessorJWT, createBatch)
router.route("/batches").get(verifyProfessorJWT, getMyBatches)
router.route("/batches/:batchId/questions").post(verifyProfessorJWT, addQuestionToBatch)
router.route("/batches/:batchId/questions/bulk").post(verifyProfessorJWT, bulkParser, bulkAddQuestionsToBatch)
router.route("/batches/:batchId/questions/:questionId").put(verifyProfessorJWT, editQuestionInBatch)
router.route("/batches/:batchId/questions/:questionId").delete(verifyProfessorJWT, deleteQuestionFromBatch)
router.route("/batches/:batchId/submit").post(verifyProfessorJWT, submitBatch)
router.route("/batches/:batchId").delete(verifyProfessorJWT, deleteBatch)

export default router