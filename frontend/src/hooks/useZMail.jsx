/**
 * useZMail — Central ZMail state hook
 *
 * Provides:
 *   - ZMail account info
 *   - Unread count (updated via Socket.IO + polling fallback)
 *   - Draft count
 *   - Folder data fetching
 *   - Socket.IO connection lifecycle
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import axios from 'axios';
import { io as socketIO } from 'socket.io-client';

const ZMailContext = createContext(null);

function getAuthToken() {
    return (
        localStorage.getItem('adminToken') ||
        localStorage.getItem('profToken') ||
        localStorage.getItem('studentToken') ||
        localStorage.getItem('auditorToken') ||
        null
    );
}

function getAuthHeader() {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

const API = '/api/zmail';

export function ZMailProvider({ children }) {
    const [account, setAccount] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [draftCount, setDraftCount] = useState(0);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);
    const toastCallbackRef = useRef(null);

    // Fetch account and counts
    const fetchCounts = useCallback(async () => {
        const headers = getAuthHeader();
        if (!headers.Authorization) return;
        try {
            const { data } = await axios.get(`${API}/counts`, { headers });
            if (data.success) {
                setUnreadCount(data.unread || 0);
                setDraftCount(data.drafts || 0);
            }
        } catch { /* non-fatal */ }
    }, []);

    const fetchAccount = useCallback(async () => {
        const headers = getAuthHeader();
        if (!headers.Authorization) return;
        try {
            const { data } = await axios.get(`${API}/account`, { headers });
            if (data.success) setAccount(data.account);
        } catch { /* non-fatal */ }
    }, []);

    // Socket.IO connection
    useEffect(() => {
        const token = getAuthToken();
        if (!token) return;

        const socket = socketIO('/zmail', {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionAttempts: 10,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            // Reconcile on reconnect
            fetchCounts();
        });

        socket.on('disconnect', () => setConnected(false));

        socket.on('zmail:unread-count', ({ count }) => {
            setUnreadCount(count || 0);
        });

        socket.on('zmail:new-message', (notification) => {
            setUnreadCount(prev => prev + 1);
            // Trigger toast if callback registered
            if (toastCallbackRef.current) {
                toastCallbackRef.current(notification);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [fetchCounts]);

    // Bootstrap
    useEffect(() => {
        const token = getAuthToken();
        if (!token) return;
        fetchAccount();
        fetchCounts();
        const interval = setInterval(fetchCounts, 60000);
        return () => clearInterval(interval);
    }, [fetchAccount, fetchCounts]);

    const registerToastCallback = useCallback((cb) => {
        toastCallbackRef.current = cb;
    }, []);

    const refreshCounts = fetchCounts;

    return (
        <ZMailContext.Provider value={{
            account,
            unreadCount,
            draftCount,
            connected,
            fetchCounts,
            fetchAccount,
            refreshCounts,
            registerToastCallback,
            getAuthHeader,
        }}>
            {children}
        </ZMailContext.Provider>
    );
}

export function useZMail() {
    const ctx = useContext(ZMailContext);
    if (!ctx) throw new Error('useZMail must be used within ZMailProvider');
    return ctx;
}

// ─── Folder API helpers ───────────────────────────────────────────────────────

export async function fetchFolder(folder, page = 1, limit = 25) {
    const headers = getAuthHeader();
    const folderMap = {
        inbox: 'inbox', sent: 'sent', drafts: 'drafts',
        starred: 'starred', important: 'important',
        archive: 'archive', trash: 'trash', all: 'all',
    };
    const endpoint = folderMap[folder] || 'inbox';
    const { data } = await axios.get(`${API}/${endpoint}`, {
        headers,
        params: { page, limit },
    });
    return data;
}

export async function fetchMessage(messageId) {
    const headers = getAuthHeader();
    const { data } = await axios.get(`${API}/messages/${messageId}`, { headers });
    return data;
}

export async function fetchThread(threadId) {
    const headers = getAuthHeader();
    const { data } = await axios.get(`${API}/threads/${threadId}`, { headers });
    return data;
}

export async function sendMessage(payload) {
    const headers = getAuthHeader();
    const { data } = await axios.post(`${API}/messages`, payload, { headers });
    return data;
}

export async function sendReply(messageId, payload) {
    const headers = getAuthHeader();
    const { data } = await axios.post(`${API}/messages/${messageId}/reply`, payload, { headers });
    return data;
}

export async function sendForward(messageId, payload) {
    const headers = getAuthHeader();
    const { data } = await axios.post(`${API}/messages/${messageId}/forward`, payload, { headers });
    return data;
}

export async function patchMessage(messageId, action) {
    const headers = getAuthHeader();
    const { data } = await axios.patch(`${API}/messages/${messageId}/${action}`, {}, { headers });
    return data;
}

export async function patchMessageWithBody(messageId, action, body) {
    const headers = getAuthHeader();
    const { data } = await axios.patch(`${API}/messages/${messageId}/${action}`, body, { headers });
    return data;
}

export async function deleteMessage(messageId) {
    const headers = getAuthHeader();
    const { data } = await axios.delete(`${API}/messages/${messageId}`, { headers });
    return data;
}

export async function emptyTrash() {
    const headers = getAuthHeader();
    const { data } = await axios.delete(`${API}/trash/empty`, { headers });
    return data;
}

export async function searchMail(query, page = 1) {
    const headers = getAuthHeader();
    const { data } = await axios.get(`${API}/search`, {
        headers,
        params: { q: query, page },
    });
    return data;
}

export async function searchUsers(q) {
    const headers = getAuthHeader();
    const { data } = await axios.get(`${API}/users/search`, {
        headers,
        params: { q },
    });
    return data;
}

export async function createDraft(payload) {
    const headers = getAuthHeader();
    const { data } = await axios.post(`${API}/drafts`, payload, { headers });
    return data;
}

export async function updateDraft(draftId, payload) {
    const headers = getAuthHeader();
    const { data } = await axios.patch(`${API}/drafts/${draftId}`, payload, { headers });
    return data;
}

export async function sendDraft(draftId) {
    const headers = getAuthHeader();
    const { data } = await axios.post(`${API}/drafts/${draftId}/send`, {}, { headers });
    return data;
}

export async function deleteDraft(draftId) {
    const headers = getAuthHeader();
    const { data } = await axios.delete(`${API}/drafts/${draftId}`, { headers });
    return data;
}
