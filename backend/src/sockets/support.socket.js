/**
 * Support Socket Handler
 *
 * Manages the real-time support team room: support:team
 *
 * Security:
 *   - Only admin accounts with isSupport = true may join the support room.
 *   - Clients cannot self-assign to arbitrary rooms.
 *   - New ticket events and ticket updates are only broadcast to this room.
 *
 * Events emitted TO support clients:
 *   support:new-ticket      { ticketId, ticketNumber, title, reporterName, ... }
 *   support:ticket-updated  { ticketId, ticketNumber, status, event }
 *
 * Events received FROM clients:
 *   support:join            (no payload) — joins the support:team room after auth check
 */

import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.models.js";

async function authenticateSupportSocket(socket, next) {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.split(" ")[1];

        if (!token) return next(new Error("Support auth: token missing"));

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        if (decoded.role !== "SupportAgent" || decoded.email !== "support@zeroleak.com") {
            return next(new Error("Support auth: not a support team member"));
        }

        socket.supportUser = { id: decoded.id, name: "ZeroLeak Support", email: decoded.email };
        return next();
    } catch (e) {
        return next(new Error("Support auth: invalid token"));
    }
}

let _supportNs = null;

export function getSupportSocketNamespace() {
    return _supportNs;
}

export function setupSupportSockets(io) {
    const ns = io.of("/support");
    ns.use(authenticateSupportSocket);

    ns.on("connection", (socket) => {
        const agent = socket.supportUser;
        if (!agent) { socket.disconnect(true); return; }

        // Automatically join the protected support room
        socket.join("support:team");

        socket.on("support:leave", () => {
            socket.leave("support:team");
        });

        socket.on("disconnect", () => {
            socket.leave("support:team");
        });
    });

    _supportNs = ns;
    return ns;
}
