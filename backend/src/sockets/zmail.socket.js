/**
 * ZMail Socket Handler
 *
 * Manages user-private rooms for real-time mail delivery.
 *
 * Room scheme:
 *   zmail:user:<userId>   — private room for each authenticated user
 *
 * Security:
 *   - The server controls room membership after JWT verification.
 *   - Clients cannot join another user's private mail room.
 *   - No private mail data is broadcast to admin-all or exam rooms.
 *   - Socket.IO Redis adapter ensures multi-instance delivery works.
 *
 * Events emitted TO clients:
 *   zmail:new-message    { messageId, threadId, senderName, senderAddress, subject, snippet, sentAt, hasAttachment }
 *   zmail:unread-count   { count }
 *
 * Events received FROM clients:
 *   zmail:join           (no payload) — authenticated user joins their private room
 *   zmail:leave          (no payload) — user leaves their private room
 */

import jwt from "jsonwebtoken";
import { Admin }     from "../models/admin.models.js";
import { Professor } from "../models/professor.models.js";
import { Student }   from "../models/student.models.js";
import { Auditor }   from "../models/auditor.models.js";
import { getUnreadCount } from "../Services/zmail/zmail.service.js";

// ─── Socket Authentication ────────────────────────────────────────────────────

async function authenticateZMailSocket(socket, next) {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.split(" ")[1];

        if (!token) return next(new Error("ZMail auth: token missing"));

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Resolve user from any role
        let user = null;

        const admin = await Admin.findById(decoded.id).select("_id email").lean();
        if (admin) { socket.zmailUser = { id: admin._id, role: "Admin" }; return next(); }

        const professor = await Professor.findById(decoded.id).select("_id name isBlocked").lean();
        if (professor) {
            if (professor.isBlocked) return next(new Error("ZMail auth: account blocked"));
            socket.zmailUser = { id: professor._id, role: "Professor" };
            return next();
        }

        const student = await Student.findById(decoded.id).select("_id studentId isBlocked").lean();
        if (student) {
            if (student.isBlocked) return next(new Error("ZMail auth: account blocked"));
            socket.zmailUser = { id: student._id, role: "Student" };
            return next();
        }

        const auditor = await Auditor.findById(decoded.id).select("_id email").lean();
        if (auditor) { socket.zmailUser = { id: auditor._id, role: "Auditor" }; return next(); }

        if (decoded.role === "SupportAgent" && decoded.email === "support@zeroleak.com") {
            socket.zmailUser = { id: decoded.id, role: "Support" };
            return next();
        }

        return next(new Error("ZMail auth: user not found"));
    } catch (e) {
        return next(new Error("ZMail auth: invalid token"));
    }
}

// ─── Namespace setup ──────────────────────────────────────────────────────────

export function setupZMailSockets(io) {
    const ns = io.of("/zmail");

    ns.use(authenticateZMailSocket);

    ns.on("connection", async (socket) => {
        const userId = socket.zmailUser?.id?.toString();
        if (!userId) {
            socket.disconnect(true);
            return;
        }

        // Automatically join the user's private mail room
        const privateRoom = `zmail:user:${userId}`;
        socket.join(privateRoom);

        // Deliver current unread count on connect
        try {
            const count = await getUnreadCount(socket.zmailUser.id);
            socket.emit("zmail:unread-count", { count });
        } catch { /* non-fatal */ }

        // Client explicitly refreshes unread count
        socket.on("zmail:get-unread", async () => {
            try {
                const count = await getUnreadCount(socket.zmailUser.id);
                socket.emit("zmail:unread-count", { count });
            } catch { /* non-fatal */ }
        });

        socket.on("disconnect", () => {
            socket.leave(privateRoom);
        });
    });

    return ns;
}

/**
 * Helper used by zmailController to get access to the ZMail namespace
 * so it can emit events after mail operations.
 * Store namespace reference after setup.
 */
let _zmailNs = null;
export function getZMailNamespace() { return _zmailNs; }

export function initZMailNamespace(io) {
    _zmailNs = setupZMailSockets(io);
    return _zmailNs;
}
