import { Router } from "express"
import {
    createProfessor,
    getAllProfessors,
    deleteProfessor,
    registerAdmin,
    loginAdmin,
    updateAdminProfile,
    getBatches,
    openBatchDetails,
    reviewBatch,
    deleteBatch,
    getDashboardStats,
    getAuditLogs,
    updateExamStatus,
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
    bulkImportStudents
} from "../controllers/admin.controllers.js"
import { verifyAdminJWT } from "../middlewares/auth.middleware.js"

const router = Router()

// ─── Public Routes ────────────────────────────────────────────────────────────
router.route("/register").post(registerAdmin)
router.route("/login").post(loginAdmin)

// ─── Protected Routes ─────────────────────────────────────────────────────────

// Dashboard Stats
router.route("/stats").get(verifyAdminJWT, getDashboardStats)

// Audit Logs
router.route("/audit-logs").get(verifyAdminJWT, getAuditLogs)

// Admin Profile
router.route("/profile").put(verifyAdminJWT, updateAdminProfile)

// Professor Management
router.route("/professors/bulk-import").post(verifyAdminJWT, bulkImportProfessors)
router.route("/professors/bulk-delete").post(verifyAdminJWT, bulkDeleteProfessors)
router.route("/professors/bulk-block").post(verifyAdminJWT, bulkBlockProfessors)
router.route("/professors").post(verifyAdminJWT, createProfessor)
router.route("/professors").get(verifyAdminJWT, getAllProfessors)
router.route("/professors/:id/block").post(verifyAdminJWT, toggleBlockProfessor)
router.route("/professors/:id").delete(verifyAdminJWT, deleteProfessor)

// Student Management
router.route("/students/bulk-import").post(verifyAdminJWT, bulkImportStudents)
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
router.route("/exams/:id").delete(verifyAdminJWT, deleteExam)

export default router