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
        if (admin.sessionVersion !== decodedToken.sessionVersion) {
            return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
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
        if (professor.sessionVersion !== decodedToken.sessionVersion) {
            return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
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
        if (student.sessionVersion !== decodedToken.sessionVersion) {
            return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
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
        if (auditor.sessionVersion !== decodedToken.sessionVersion) {
            return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
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
            if (admin.sessionVersion !== decodedToken.sessionVersion) {
                return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
            }
            req.admin = admin
            req.userRole = "Admin"
            return next()
        }

        const auditor = await Auditor.findById(decodedToken.id).select("-password")
        if (auditor) {
            if (auditor.sessionVersion !== decodedToken.sessionVersion) {
                return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
            }
            req.auditor = auditor
            req.userRole = "Auditor"
            return next()
        }

        return res.status(401).json({ message: "Unauthorized request: Neither Admin nor Auditor found" })
    } catch (error) {
        return res.status(401).json({ message: "Invalid or Expired Access Token", code: "TOKEN_EXPIRED" })
    }
}

export const verifyAnyJWT = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization")
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader

        if (!token) {
            return res.status(401).json({ message: "Unauthorized request: No token provided" })
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        // Sequential lookups with early return (1-2 queries instead of 4 parallel)
        // Ideal fix: encode role in JWT to avoid any extra lookup
        const admin = await Admin.findById(decodedToken.id).select("-password")
        if (admin) {
            if (admin.sessionVersion !== decodedToken.sessionVersion) {
                return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
            }
            req.user = admin
            req.userRole = "Admin"
            return next()
        }

        const professor = await Professor.findById(decodedToken.id).select("-password")
        if (professor) {
            if (professor.sessionVersion !== decodedToken.sessionVersion) {
                return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
            }
            req.user = professor
            req.userRole = "Professor"
            return next()
        }

        const student = await Student.findById(decodedToken.id).select("-password")
        if (student) {
            if (student.sessionVersion !== decodedToken.sessionVersion) {
                return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
            }
            req.user = student
            req.userRole = "Student"
            return next()
        }

        const auditor = await Auditor.findById(decodedToken.id).select("-password")
        if (auditor) {
            if (auditor.sessionVersion !== decodedToken.sessionVersion) {
                return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
            }
            req.user = auditor
            req.userRole = "Auditor"
            return next()
        }

        return res.status(401).json({ message: "User not found" })
    } catch (error) {
        return res.status(401).json({ message: "Invalid or Expired Access Token", code: "TOKEN_EXPIRED" })
    }
}