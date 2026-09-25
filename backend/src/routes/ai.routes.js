import { Router } from "express"
import { verifyProfessorJWT } from "../middlewares/auth.middleware.js"
import { rateLimit } from "../middlewares/rateLimit.middleware.js"
import { RATE_LIMITS } from "../Services/ai/ai.policy.js"
import { generateBatch, generateQuestion, fixQuestionImport } from "../controllers/ai.controllers.js"

const router = Router()

// All AI routes require professor authentication
router.use(verifyProfessorJWT)

router.post(
    "/generate-batch",
    rateLimit("ai:batch", RATE_LIMITS.BATCH_GENERATE),
    generateBatch
)

router.post(
    "/generate-question",
    rateLimit("ai:question", RATE_LIMITS.QUESTION_GENERATE),
    generateQuestion
)

router.post(
    "/fix-question-import",
    rateLimit("ai:csv", RATE_LIMITS.CSV_REPAIR),
    fixQuestionImport
)

export default router
