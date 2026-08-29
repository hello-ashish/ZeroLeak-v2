import { Router } from "express"
import { createProfessor, getAllProfessors, deleteProfessor, registerAdmin, loginAdmin } from "../controllers/admin.controllers.js"
import { verifyAdminJWT } from "../middlewares/auth.middleware.js"

const router = Router()

// Public Routes (No bouncer needed. Anyone can try to register or login)
router.route("/register").post(registerAdmin)
router.route("/login").post(loginAdmin)

// Secured Routes (We put the bouncer 'verifyAdminJWT' in the middle!)
// When someone hits POST /professors:
// First, verifyAdminJWT runs. If it fails, it stops. 
// If it succeeds and calls next(), THEN createProfessor runs!

// route to create anew professor
// it triggers when a POST request hits /api/admin/professors
router.route("/professors").post(verifyAdminJWT, createProfessor)

// route to get all professors
// it triggers when a GET request hits api/admin/professors
router.route("/professors").get(verifyAdminJWT, getAllProfessors)

// route to delete a professor by id
// the :id acts as a placeholder for the actual ID, e.g., /api/admin/professors/123
router.route("/professors/:id").delete(verifyAdminJWT, deleteProfessor)



export default router