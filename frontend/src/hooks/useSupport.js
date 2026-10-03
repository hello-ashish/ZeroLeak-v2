/**
 * useSupport — Frontend API hook for the ZeroLeak Support System
 */

const API = "/api/support";

function getAuthHeader() {
    const token =
        localStorage.getItem("supportToken") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("profToken") ||
        localStorage.getItem("studentToken") ||
        localStorage.getItem("auditorToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
            ...(options.headers || {}),
        },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Request failed");
    return data;
}

// ── User endpoints ──────────────────────────────────────────────────────────────

export async function fetchSupportConstants() {
    return apiFetch("/constants");
}

export async function createSupportTicket(payload) {
    return apiFetch("/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function fetchMyTickets(page = 1) {
    return apiFetch(`/my-tickets?page=${page}`);
}

export async function fetchMyTicket(ticketId) {
    return apiFetch(`/my-tickets/${ticketId}`);
}

export async function replyToMyTicket(ticketId, body) {
    return apiFetch(`/my-tickets/${ticketId}/reply`, {
        method: "POST",
        body: JSON.stringify({ body }),
    });
}

// ── Support team endpoints ──────────────────────────────────────────────────────

export async function fetchSupportTickets(params = {}) {
    const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
    ).toString();
    return apiFetch(`/tickets${qs ? `?${qs}` : ""}`);
}

export async function fetchSupportTicket(ticketId) {
    return apiFetch(`/tickets/${ticketId}`);
}

export async function changeSupportTicketStatus(ticketId, status) {
    return apiFetch(`/tickets/${ticketId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
    });
}

export async function changeSupportTicketPriority(ticketId, priority) {
    return apiFetch(`/tickets/${ticketId}/priority`, {
        method: "PATCH",
        body: JSON.stringify({ priority }),
    });
}

export async function assignSupportTicket(ticketId, assignToId) {
    return apiFetch(`/tickets/${ticketId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assignToId: assignToId || null }),
    });
}

export async function supportAgentReply(ticketId, body) {
    return apiFetch(`/tickets/${ticketId}/reply`, {
        method: "POST",
        body: JSON.stringify({ body }),
    });
}

export async function addSupportInternalNote(ticketId, content) {
    return apiFetch(`/tickets/${ticketId}/notes`, {
        method: "POST",
        body: JSON.stringify({ content }),
    });
}

export async function fetchSupportInternalNotes(ticketId) {
    return apiFetch(`/tickets/${ticketId}/notes`);
}

export async function fetchSupportTicketHistory(ticketId) {
    return apiFetch(`/tickets/${ticketId}/history`);
}

export async function fetchSupportStats() {
    return apiFetch("/stats");
}
