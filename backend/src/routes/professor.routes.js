import { Router } from "express"
import { loginProfessor } from "../controllers/professor.controllers.js"

const router = Router()

// route to login professor
// it triggers when a POST request hits /api/professor/login
router.route("/login").post(loginProfessor)



export default router