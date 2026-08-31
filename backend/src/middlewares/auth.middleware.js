import jwt from "jsonwebtoken"
import { Admin } from "../models/admin.models.js"
import { Professor } from "../models/professor.models.js"

export const verifyAdminJWT = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization")
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader

        if (!token) {
            return res.status(401).json({ message: "Unauthorized request: No token provided" })
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const admin = await Admin.findById(decodedToken.id).select("-password")

        if (!admin) {
            return res.status(401).json({ message: "Unauthorized request: Admin not found" })
        }

        req.admin = admin
        next()
    } catch (error) {
        console.error("JWT Verification Error:", error.message)
        return res.status(401).json({ message: "Invalid or Expired Access Token" })
    }
}

export const verifyProfessorJWT = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization")
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader

        if (!token) {
            return res.status(401).json({ message: "Unauthorized request: No token provided" })
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const professor = await Professor.findById(decodedToken.id).select("-password")

        if (!professor) {
            return res.status(401).json({ message: "Unauthorized request: Professor not found" })
        }

        // ATTACHMENT: We attach the professor to the request.
        // This is crucial because now our Question Controller will know exactly WHO is creating the question!
        req.professor = professor
        next()
    } catch (error) {
        console.error("JWT Verification Error:", error.message)
        return res.status(401).json({ message: "Invalid or Expired Access Token" })
    }
}