import jwt from "jsonwebtoken"
import { Admin } from "../models/admin.models.js"
import { Professor } from "../models/professor.models.js"
import { Student } from "../models/student.models.js"
import { Auditor } from "../models/auditor.models.js"

export const validateSession = async (Model, decodedToken) => {
    const user = await Model.findById(decodedToken.id).select("-password");
    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }
    if (user.sessionVersion !== decodedToken.sessionVersion) {
        throw new Error("SESSION_REPLACED");
    }
    if (user.isBlocked) {
        throw new Error("BLOCKED");
    }
    return user;
};

export const authenticateWebSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
        if (!token) return next(new Error("Authentication error: Token missing"));
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        let user;
        let role = decoded.role;
        
        if (role === "Student") {
            user = await validateSession(Student, decoded);
        } else if (role === "Admin") {
            user = await validateSession(Admin, decoded);
        } else if (role === "Professor") {
            user = await validateSession(Professor, decoded);
        } else if (role === "Auditor") {
            user = await validateSession(Auditor, decoded);
        } else {
            try { user = await validateSession(Student, decoded); role = "Student"; } 
            catch(e) { 
                try { user = await validateSession(Admin, decoded); role = "Admin"; } 
                catch(e) {
                    try { user = await validateSession(Professor, decoded); role = "Professor"; }
                    catch(e) {
                        try { user = await validateSession(Auditor, decoded); role = "Auditor"; }
                        catch(e) { return next(new Error("Authentication error: Invalid session or user not found")); }
                    }
                }
            }
        }
        
        socket.user = { 
            id: user._id, 
            role, 
            email: user.email, 
            studentId: user.studentId, 
            isSupport: user.isSupport 
        };
        return next();
    } catch (error) {
        return next(new Error("Authentication error: " + error.message));
    }
};

export const verifyAdminJWT = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization")
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader

        if (!token) {
            return res.status(401).json({ message: "Unauthorized request: No token provided" })
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const admin = await validateSession(Admin, decodedToken);
        if (admin.isSupport) {
            return res.status(403).json({ message: "Forbidden: Support members cannot access Admin routes" })
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
        const professor = await validateSession(Professor, decodedToken);

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
        const student = await validateSession(Student, decodedToken);

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
        if (auditor.isBlocked) {
            return res.status(403).json({ message: "BLOCKED" })
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
            if (admin.isBlocked) {
                return res.status(403).json({ message: "BLOCKED" })
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
            if (auditor.isBlocked) {
                return res.status(403).json({ message: "BLOCKED" })
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

        // Sequential lookups with early return
        if (decodedToken.role === "Admin") {
            const admin = await Admin.findById(decodedToken.id).select("-password")
            if (admin) {
                if (admin.sessionVersion !== decodedToken.sessionVersion) {
                    return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
                }
                if (admin.isBlocked) {
                    return res.status(403).json({ message: "BLOCKED" })
                }
                req.user = admin
                req.userRole = "Admin"
                if (admin.isSupport) {
                    req.userRole = "Support" // Map support admins to Support role for ZMail and other systems
                }
                return next()
            }
        } else if (decodedToken.role === "Professor") {
            const professor = await Professor.findById(decodedToken.id).select("-password")
            if (professor) {
                if (professor.sessionVersion !== decodedToken.sessionVersion) {
                    return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
                }
                req.user = professor
                req.userRole = "Professor"
                return next()
            }
        } else if (decodedToken.role === "Student") {
            const student = await Student.findById(decodedToken.id).select("-password")
            if (student) {
                if (student.sessionVersion !== decodedToken.sessionVersion) {
                    return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
                }
                req.user = student
                req.userRole = "Student"
                return next()
            }
        } else if (decodedToken.role === "Auditor") {
            const auditor = await Auditor.findById(decodedToken.id).select("-password")
            if (auditor) {
                if (auditor.sessionVersion !== decodedToken.sessionVersion) {
                    return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
                }
                if (auditor.isBlocked) {
                    return res.status(403).json({ message: "BLOCKED" })
                }
                req.user = auditor
                req.userRole = "Auditor"
                return next()
            }
        }

        if (decodedToken.role === "SupportAgent") {
            const admin = await Admin.findById(decodedToken.id).select("-password")
            if (admin && admin.isSupport && !admin.isBlocked) {
                if (admin.sessionVersion !== decodedToken.sessionVersion) {
                    return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
                }
                req.userRole = "Support"
                req.user = admin
                return next()
            }
        }

        return res.status(401).json({ message: "User not found" })
    } catch (error) {
        return res.status(401).json({ message: "Invalid or Expired Access Token", code: "TOKEN_EXPIRED" })
    }
}

/**
 * Middleware that allows ONLY the standalone support account.
 */
export const verifySupportJWT = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization")
        const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader

        if (!token) {
            return res.status(401).json({ message: "Unauthorized request: No token provided" })
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        if (decodedToken.role === "SupportAgent") {
            const admin = await Admin.findById(decodedToken.id).select("-password")
            if (admin && admin.isSupport && !admin.isBlocked) {
                if (admin.sessionVersion !== decodedToken.sessionVersion) {
                    return res.status(401).json({ message: "This session has been replaced by a new login.", code: "SESSION_REPLACED" })
                }
                req.userRole = "Support"
                req.user = admin
                return next()
            }
        }

        return res.status(403).json({ message: "Forbidden: Support access only" })
    } catch (error) {
        return res.status(401).json({ message: "Invalid or Expired Access Token", code: "TOKEN_EXPIRED" })
    }
}