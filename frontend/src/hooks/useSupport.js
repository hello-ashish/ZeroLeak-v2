/**
 * useSupport — Frontend API hook for the ZeroLeak Support System
 */

const API = "/api/support";

/**
 * Resolve the correct token for the caller's role.
 * The `role` parameter matches what is stored in localStorage.
 * Passing no role falls back to the first available token (legacy behaviour for support team panel).
 */
function getAuthHeader(role) {
    let token;
    if (role === "admin")    token = localStorage.getItem("adminToken");
    else if (role === "professor") token = localStorage.getItem("profToken");
    else if (role === "student")   token = localStorage.getItem("studentToken");
    else if (role === "auditor")   token = localStorage.getItem("auditorToken");
    else if (role === "support")   token = localStorage.getItem("supportToken");
    else {
        // Support-panel default: use supportToken, never fall through to adminToken
        token = localStorage.getItem("supportToken");
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}, role) {
    const res = await fetch(`${API}${path}`, {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(role),
            ...(options.headers || {}),
        },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || "Request failed");
    return data;
}

// ── User endpoints ──────────────────────────────────────────────────────────────

export async function fetchSupportConstants(role) {
    return apiFetch("/constants", {}, role);
}

export async function createSupportTicket(payload, role) {
    return apiFetch("/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
    }, role);
}

export async function fetchMyTickets(page = 1, role) {
    return apiFetch(`/my-tickets?page=${page}`, {}, role);
}

export async function fetchMyTicket(ticketId, role) {
    return apiFetch(`/my-tickets/${ticketId}`, {}, role);
}

export async function replyToMyTicket(ticketId, body, role) {
    return apiFetch(`/my-tickets/${ticketId}/reply`, {
        method: "POST",
        body: JSON.stringify({ body }),
    }, role);
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

export async function fetchGlobalSupportHistory(page = 1) {
    // Support team always uses supportToken for this privileged endpoint
    return apiFetch(`/global-history?page=${page}`, {}, "support");
}
