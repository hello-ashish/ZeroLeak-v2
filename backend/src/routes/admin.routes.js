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
    getDashboardStats,
    getAuditLogs,
    updateExamStatus,
    deleteExam,
    deleteStudent,
    getLiveStudents,
    toggleBlockStudent
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
router.route("/professors").post(verifyAdminJWT, createProfessor)
router.route("/professors").get(verifyAdminJWT, getAllProfessors)
router.route("/professors/:id").delete(verifyAdminJWT, deleteProfessor)

// Student Management
router.route("/students/live").get(verifyAdminJWT, getLiveStudents)
router.route("/students/:id/block").post(verifyAdminJWT, toggleBlockStudent)
router.route("/students/:id").delete(verifyAdminJWT, deleteStudent)

// Batch Management
router.route("/batches").get(verifyAdminJWT, getBatches)
router.route("/batches/:batchId").get(verifyAdminJWT, openBatchDetails)
router.route("/batches/:batchId/review").post(verifyAdminJWT, reviewBatch)

// Exam Management (status + delete)
router.route("/exams/:id/status").patch(verifyAdminJWT, updateExamStatus)
router.route("/exams/:id").delete(verifyAdminJWT, deleteExam)

export default router