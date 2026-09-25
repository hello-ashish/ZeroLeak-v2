import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.models.js";
import { Student } from "../models/student.models.js";
import { ProctoringSession } from "../models/proctoringSession.models.js";
import { ProctoringIncident } from "../models/proctoringIncident.models.js";

// Authenticate socket connection
const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];
        if (!token) {
            return next(new Error("Authentication error: Token missing"));
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Check if Admin
        const admin = await Admin.findById(decoded.id).select("-password");
        if (admin) {
            socket.user = { id: admin._id, role: "Admin", email: admin.email };
            return next();
        }

        // Check if Student
        const student = await Student.findById(decoded.id).select("-password");
        if (student) {
            if (student.isBlocked) {
                return next(new Error("Authentication error: Student is blocked"));
            }
            socket.user = { id: student._id, role: "Student", studentId: student.studentId };
            return next();
        }

        return next(new Error("Authentication error: Invalid role or user not found"));
    } catch (error) {
        console.error("[PROCTORING_SOCKET] Auth error:", error.message);
        return next(new Error("Authentication error: Invalid token"));
    }
};

export const setupProctoringSockets = (io) => {
    const proctoringNamespace = io.of("/proctoring");

    // Apply authentication middleware
    proctoringNamespace.use(authenticateSocket);

    proctoringNamespace.on("connection", (socket) => {
        const { user } = socket;
        console.log(`[PROCTORING_SOCKET] User connected: ${user.id} (${user.role})`);

        // ==========================================
        // ADMIN EVENTS
        // ==========================================
        if (user.role === "Admin") {
            // Join the admin room to receive all proctoring events
            socket.join("admin_room");

            socket.on("proctoring:admin-join", () => {
                console.log(`[PROCTORING_SOCKET] Admin ${user.id} joined admin_room`);
            });

            // WebRTC signaling from Admin to specific Student
            socket.on("proctoring:offer", ({ targetSocketId, offer }) => {
                socket.to(targetSocketId).emit("proctoring:offer", { fromAdminSocketId: socket.id, offer });
            });

            socket.on("proctoring:answer", ({ targetSocketId, answer }) => {
                socket.to(targetSocketId).emit("proctoring:answer", { fromAdminSocketId: socket.id, answer });
            });

            socket.on("proctoring:ice-candidate", ({ targetSocketId, candidate }) => {
                socket.to(targetSocketId).emit("proctoring:ice-candidate", { fromAdminSocketId: socket.id, candidate });
            });
            
            socket.on("proctoring:request-stream", ({ studentSocketId }) => {
                // Admin asks the student to initiate an offer
                socket.to(studentSocketId).emit("proctoring:stream-requested", { adminSocketId: socket.id });
            });

            socket.on("proctoring:stop-monitoring", ({ studentSocketId }) => {
                 socket.to(studentSocketId).emit("proctoring:monitoring-stopped", { adminSocketId: socket.id });
            });

            socket.on("disconnect", () => {
                console.log(`[PROCTORING_SOCKET] Admin ${user.id} disconnected`);
            });
        }

        // ==========================================
        // STUDENT EVENTS
        // ==========================================
        else if (user.role === "Student") {
            let currentSessionId = null;

            socket.on("proctoring:join", async ({ examId }) => {
                try {
                    // Find existing active/initializing session, or create a new one
                    let session = await ProctoringSession.findOne({
                        studentId: user.id,
                        examId,
                        status: { $in: ["INITIALIZING", "ACTIVE", "PAUSED", "DISCONNECTED"] }
                    });

                    if (!session) {
                        session = await ProctoringSession.create({
                            studentId: user.id,
                            examId,
                            status: "ACTIVE",
                            socketId: socket.id
                        });
                    } else {
                        session.socketId = socket.id;
                        session.status = "ACTIVE";
                        session.connectionStatus = "ONLINE";
                        session.lastHeartbeat = new Date();
                        await session.save();
                    }

                    currentSessionId = session._id;

                    // Join a room specific to this session for direct signaling
                    socket.join(session._id.toString());
                    
                    // Notify admins
                    proctoringNamespace.to("admin_room").emit("proctoring:student-joined", {
                        sessionId: session._id,
                        studentId: user.id,
                        examId,
                        socketId: socket.id
                    });

                    socket.emit("proctoring:session-ready", { sessionId: session._id });
                } catch (error) {
                    console.error("[PROCTORING_SOCKET] Join error:", error);
                    socket.emit("proctoring:error", { message: "Failed to join proctoring session" });
                }
            });

            socket.on("proctoring:heartbeat", async (data) => {
                if (!currentSessionId) return;
                try {
                    const session = await ProctoringSession.findById(currentSessionId);
                    if (session) {
                        session.lastHeartbeat = new Date();
                        session.lastSeenAt = new Date();
                        session.connectionStatus = "ONLINE";
                        
                        // Update device status if provided
                        if (data?.cameraStatus) session.cameraStatus = data.cameraStatus;
                        if (data?.microphoneStatus) session.microphoneStatus = data.microphoneStatus;
                        if (data?.fullscreenStatus) session.fullscreenStatus = data.fullscreenStatus;

                        await session.save();

                        proctoringNamespace.to("admin_room").emit("proctoring:heartbeat-update", {
                            sessionId: currentSessionId,
                            studentId: user.id,
                            lastHeartbeat: session.lastHeartbeat,
                            cameraStatus: session.cameraStatus,
                            microphoneStatus: session.microphoneStatus,
                            fullscreenStatus: session.fullscreenStatus,
                            connectionStatus: session.connectionStatus
                        });
                    }
                } catch (error) {
                    console.error("[PROCTORING_SOCKET] Heartbeat error:", error);
                }
            });

            socket.on("proctoring:status", async (data) => {
                if (!currentSessionId) return;
                try {
                     const session = await ProctoringSession.findById(currentSessionId);
                     if (session) {
                         let updated = false;
                         if (data.cameraStatus && session.cameraStatus !== data.cameraStatus) {
                             session.cameraStatus = data.cameraStatus;
                             updated = true;
                         }
                         if (data.microphoneStatus && session.microphoneStatus !== data.microphoneStatus) {
                             session.microphoneStatus = data.microphoneStatus;
                             updated = true;
                         }
                         
                         if (updated) {
                             await session.save();
                             proctoringNamespace.to("admin_room").emit("proctoring:student-updated", {
                                 sessionId: currentSessionId,
                                 cameraStatus: session.cameraStatus,
                                 microphoneStatus: session.microphoneStatus
                             });
                         }
                     }
                } catch (error) {
                    console.error("[PROCTORING_SOCKET] Status error:", error);
                }
            });

            socket.on("proctoring:event", async (data) => {
                if (!currentSessionId) return;
                try {
                    const { type, severity, description, details } = data;
                    
                    const session = await ProctoringSession.findById(currentSessionId);
                    if (!session) return;

                    const incident = await ProctoringIncident.create({
                        examId: session.examId,
                        studentId: user.id,
                        proctoringSessionId: currentSessionId,
                        type,
                        severity: (severity || "MEDIUM").toUpperCase(),
                        metadata: details,
                        notes: description
                    });

                    // Update session counts
                    if (type === "TAB_SWITCH") session.tabSwitchCount += 1;
                    if (type === "WINDOW_BLUR") session.windowBlurCount += 1;
                    session.incidentCount += 1;
                    await session.save();

                    proctoringNamespace.to("admin_room").emit("proctoring:incident", {
                        sessionId: currentSessionId,
                        studentId: user.id,
                        incident
                    });
                } catch (error) {
                     console.error("[PROCTORING_SOCKET] Event error:", error);
                }
            });

            // WebRTC Signaling from Student to Admin
            socket.on("proctoring:offer", ({ targetSocketId, offer }) => {
                socket.to(targetSocketId).emit("proctoring:offer", { fromStudentSocketId: socket.id, studentId: user.id, offer });
            });

            socket.on("proctoring:answer", ({ targetSocketId, answer }) => {
                socket.to(targetSocketId).emit("proctoring:answer", { fromStudentSocketId: socket.id, studentId: user.id, answer });
            });

            socket.on("proctoring:ice-candidate", ({ targetSocketId, candidate }) => {
                socket.to(targetSocketId).emit("proctoring:ice-candidate", { fromStudentSocketId: socket.id, studentId: user.id, candidate });
            });

            socket.on("proctoring:leave", async () => {
                if (!currentSessionId) return;
                try {
                    const session = await ProctoringSession.findById(currentSessionId);
                    if (session) {
                        session.status = "ENDED";
                        session.endedAt = new Date();
                        session.connectionStatus = "OFFLINE";
                        await session.save();

                        proctoringNamespace.to("admin_room").emit("proctoring:student-left", {
                            sessionId: currentSessionId,
                            studentId: user.id
                        });
                    }
                    currentSessionId = null;
                } catch (error) {
                    console.error("[PROCTORING_SOCKET] Leave error:", error);
                }
            });

            socket.on("disconnect", async () => {
                console.log(`[PROCTORING_SOCKET] Student ${user.id} disconnected`);
                if (currentSessionId) {
                    try {
                        const session = await ProctoringSession.findById(currentSessionId);
                        if (session && session.status === "ACTIVE") {
                            session.status = "DISCONNECTED";
                            session.connectionStatus = "OFFLINE";
                            await session.save();
                            
                            proctoringNamespace.to("admin_room").emit("proctoring:student-updated", {
                                sessionId: currentSessionId,
                                status: "DISCONNECTED",
                                connectionStatus: "OFFLINE"
                            });
                        }
                    } catch (error) {
                        console.error("[PROCTORING_SOCKET] Disconnect error:", error);
                    }
                }
            });
        }
    });
};
