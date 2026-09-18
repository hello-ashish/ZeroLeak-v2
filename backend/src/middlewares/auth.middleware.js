import jwt from "jsonwebtoken"
import { Admin } from "../models/admin.models.js"
import { Professor } from "../models/professor.models.js"
import { Student } from "../models/student.models.js"
import { Auditor } from "../models/auditor.models.js"

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
        return res.status(401).json({ message: "Invalid or Expired Access Token", code: "TOKEN_EXPIRED" })
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

        req.professor = professor
        next()
    } catch (error) {
        return res.status(401).json({ message: "Invalid or Expired Access Token", code: "TOKEN_EXPIRED" })
    }
}

export const verifyStudentJWT = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization")
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader

        if (!token) {
            return res.status(401).json({ message: "Unauthorized request: No token provided" })
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const student = await Student.findById(decodedToken.id).select("-password")

        if (!student) {
            return res.status(401).json({ message: "Student not found" })
        }

        if (student.isBlocked) {
            return res.status(403).json({ message: "BLOCKED" })
        }

        req.student = student
        next()
    } catch (error) {
        return res.status(401).json({ message: "Invalid or Expired Access Token", code: "TOKEN_EXPIRED" })
    }
}

export const verifyAuditorJWT = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization")
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader

        if (!token) {
            return res.status(401).json({ message: "Unauthorized request: No token provided" })
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const auditor = await Auditor.findById(decodedToken.id).select("-password")

        if (!auditor) {
            return res.status(401).json({ message: "Auditor not found" })
        }

        req.auditor = auditor
        next()
    } catch (error) {
        return res.status(401).json({ message: "Invalid or Expired Access Token", code: "TOKEN_EXPIRED" })
    }
}

export const verifyAdminOrAuditorJWT = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization")
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader

        if (!token) {
            return res.status(401).json({ message: "Unauthorized request: No token provided" })
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const admin = await Admin.findById(decodedToken.id).select("-password")
        if (admin) {
            req.admin = admin
            req.userRole = "Admin"
            return next()
        }

        const auditor = await Auditor.findById(decodedToken.id).select("-password")
        if (auditor) {
            req.auditor = auditor
            req.userRole = "Auditor"
            return next()
        }

        return res.status(401).json({ message: "Unauthorized request: Neither Admin nor Auditor found" })
    } catch (error) {
        return res.status(401).json({ message: "Invalid or Expired Access Token", code: "TOKEN_EXPIRED" })
    }
}