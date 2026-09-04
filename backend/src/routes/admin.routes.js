import { Router } from "express"
import { createProfessor, getAllProfessors, deleteProfessor, registerAdmin, loginAdmin } from "../controllers/admin.controllers.js"
import { verifyAdminJWT } from "../middlewares/auth.middleware.js"
import { getBatches, openBatchDetails, reviewBatch } from "../controllers/admin.controllers.js"

const router = Router()

// Public Routes
router.route("/register").post(registerAdmin)
router.route("/login").post(loginAdmin)

// route to create anew professor
router.route("/professors").post(verifyAdminJWT, createProfessor)

// route to get all professors
router.route("/professors").get(verifyAdminJWT, getAllProfessors)

// route to delete a professor by id
router.route("/professors/:id").delete(verifyAdminJWT, deleteProfessor)

// Batch Review Routes
router.route("/batches").get(verifyAdminJWT, getBatches)
router.route("/batches/:batchId").get(verifyAdminJWT, openBatchDetails)
router.route("/batches/:batchId/review").post(verifyAdminJWT, reviewBatch)

export default router