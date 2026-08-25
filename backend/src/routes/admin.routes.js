import { Router } from "express"
import { createProfessor, getAllProfessors, deleteProfessor } from "../controllers/admin.controllers.js"

const router = Router()

// route to create anew professor
// it triggers when a POST request hits /api/admin/professors
router.route("/professors").post(createProfessor)

// route to get all professors
// it triggers when a GET request hits api/admin/professors
router.route("/professors").get(getAllProfessors)

// route to delete a professor by id
// the :id acts as a placeholder for the actual ID, e.g., /api/admin/professors/123
router.route("/professors/:id").delete(deleteProfessor)



export default router