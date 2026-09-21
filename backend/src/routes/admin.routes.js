import express, { Router } from "express"
import {
    createProfessor,
    getAllProfessors,
    deleteProfessor,
    createAdmin,
    bootstrapAdmin,
    loginAdmin,
    updateAdminProfile,
    getBatches,
    openBatchDetails,
    reviewBatch,
    deleteBatch,
    getDashboardStats,
    getAuditLogs,
    updateExamStatus,
    toggleExamResultsRelease,
    deleteExam,
    deleteStudent,
    getLiveStudents,
    toggleBlockStudent,
    toggleBlockProfessor,
    bulkDeleteProfessors,
    bulkBlockProfessors,
    bulkImportProfessors,
    bulkDeleteStudents,
    bulkBlockStudents,
    bulkImportStudents,
    logoutAdmin
} from "../controllers/admin.controllers.js"
import { verifyAdminJWT } from "../middlewares/auth.middleware.js"
import { authLimiter } from "../middlewares/rateLimiter.middleware.js"

const router = Router()
const bulkParser = express.json({ limit: "50mb" })

// ─── Public Routes ────────────────────────────────────────────────────────────
router.route("/bootstrap").post(authLimiter, bootstrapAdmin)
router.route("/login").post(authLimiter, loginAdmin)
router.route("/logout").post(logoutAdmin)

// ─── Protected Routes ─────────────────────────────────────────────────────────
router.route("/admins").post(verifyAdminJWT, authLimiter, createAdmin)

// Dashboard Stats
router.route("/stats").get(verifyAdminJWT, getDashboardStats)

// Audit Logs
router.route("/audit-logs").get(verifyAdminJWT, getAuditLogs)

// Admin Profile
router.route("/profile").put(verifyAdminJWT, updateAdminProfile)

// Professor Management
router.route("/professors/bulk-import").post(verifyAdminJWT, bulkParser, bulkImportProfessors)
router.route("/professors/bulk-delete").post(verifyAdminJWT, bulkDeleteProfessors)
router.route("/professors/bulk-block").post(verifyAdminJWT, bulkBlockProfessors)
router.route("/professors").post(verifyAdminJWT, createProfessor)
router.route("/professors").get(verifyAdminJWT, getAllProfessors)
router.route("/professors/:id/block").post(verifyAdminJWT, toggleBlockProfessor)
router.route("/professors/:id").delete(verifyAdminJWT, deleteProfessor)

// Student Management
router.route("/students/bulk-import").post(verifyAdminJWT, bulkParser, bulkImportStudents)
router.route("/students/bulk-delete").post(verifyAdminJWT, bulkDeleteStudents)
router.route("/students/bulk-block").post(verifyAdminJWT, bulkBlockStudents)
router.route("/students/live").get(verifyAdminJWT, getLiveStudents)
router.route("/students/:id/block").post(verifyAdminJWT, toggleBlockStudent)
router.route("/students/:id").delete(verifyAdminJWT, deleteStudent)

// Batch Management
router.route("/batches").get(verifyAdminJWT, getBatches)
router.route("/batches/:batchId").get(verifyAdminJWT, openBatchDetails)
router.route("/batches/:batchId").delete(verifyAdminJWT, deleteBatch)
router.route("/batches/:batchId/review").post(verifyAdminJWT, reviewBatch)

// Exam Management (status + delete)
router.route("/exams/:id/status").patch(verifyAdminJWT, updateExamStatus)
router.route("/exams/:id/release-results").patch(verifyAdminJWT, toggleExamResultsRelease)
router.route("/exams/:id").delete(verifyAdminJWT, deleteExam)

export default router