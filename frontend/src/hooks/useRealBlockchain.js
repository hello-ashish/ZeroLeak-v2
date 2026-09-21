import { API_BASE_URL } from '../api.js';
import { useState, useEffect } from 'react';

// Using fetch since we don't know the exact axios setup in this project
// We assume there's a token in localStorage if it's admin/auditor
export function useRealBlockchain() {
    const [ledger, setLedger] = useState([]);
    const [status, setStatus] = useState(null);
    const [anchor, setAnchor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('auditorToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [statusRes, ledgerRes, anchorRes] = await Promise.all([
                fetch('${API_BASE_URL}/blockchain/status', { headers: getAuthHeaders() }),
                fetch('${API_BASE_URL}/blockchain/ledger?limit=50', { headers: getAuthHeaders() }),
                fetch('${API_BASE_URL}/blockchain/anchor', { headers: getAuthHeaders() })
            ]);

            if (!statusRes.ok) throw new Error('Failed to fetch status');
            
            const statusData = await statusRes.json();
            setStatus(statusData);

            if (ledgerRes.ok) {
                const ledgerData = await ledgerRes.json();
                setLedger(ledgerData.blocks || []);
            }

            if (anchorRes.ok) {
                const anchorData = await anchorRes.json();
                setAnchor(anchorData.anchor || null);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const verifyLedger = async () => {
        try {
            const res = await fetch('${API_BASE_URL}/blockchain/verify', { headers: getAuthHeaders() });
            const data = await res.json();
            return data.verification;
        } catch (err) {
            console.error(err);
            return { valid: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    return {
        ledger,
        status,
        anchor,
        loading,
        error,
        refresh: fetchAllData,
        verifyLedger
    };
}
