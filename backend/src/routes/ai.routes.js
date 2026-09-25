import { Router } from "express"
import { verifyProfessorJWT, verifyAdminJWT } from "../middlewares/auth.middleware.js"
import { rateLimit } from "../middlewares/rateLimit.middleware.js"
import { RATE_LIMITS } from "../Services/ai/ai.policy.js"
import { generateBatch, generateQuestion, fixQuestionImport, reviewBatchAdmin, auditSummaryAdmin, cohortReportAdmin, examCopilotAdmin, policyRewriteAdmin } from "../controllers/ai.controllers.js"

const router = Router()

// All AI routes require professor authentication

router.post(
    "/generate-batch",
    verifyProfessorJWT,
    rateLimit("ai:batch", RATE_LIMITS.BATCH_GENERATE),
    generateBatch
)

router.post(
    "/generate-question",
    verifyProfessorJWT,
    rateLimit("ai:question", RATE_LIMITS.QUESTION_GENERATE),
    generateQuestion
)

router.post(
    "/fix-question-import",
    verifyProfessorJWT,
    rateLimit("ai:csv", RATE_LIMITS.CSV_REPAIR),
    fixQuestionImport
)

// Admin AI Routes
router.post(
    "/admin/review-batch",
    verifyAdminJWT,
    reviewBatchAdmin
)

router.post(
    "/admin/audit-summary",
    verifyAdminJWT,
    auditSummaryAdmin
)

router.post(
    "/admin/cohort-report",
    verifyAdminJWT,
    cohortReportAdmin
)

router.post(
    "/admin/exam-copilot",
    verifyAdminJWT,
    examCopilotAdmin
)

router.post(
    "/admin/policy-rewrite",
    verifyAdminJWT,
    policyRewriteAdmin
)

export default router
