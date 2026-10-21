// =============================================================================
// ZeroLeak — FabricIntegrityCenter.jsx
// =============================================================================
// Real Fabric Integrity Center — shows actual Fabric network status,
// live ledger height, recent commitments, entity verification, and bulk
// "Verify Ledger" scan with block-by-block tamper detection display.
// =============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Blocks, Shield, ShieldCheck, ShieldAlert, ShieldOff,
    Activity, Database, Hash, Clock, RefreshCw,
    CheckCircle, XCircle, AlertTriangle, Loader2,
    ChevronRight, Eye, Network, Layers, Box,
    AlertCircle, Info, BellRing, ScanLine, Play,
    ChevronDown, ChevronUp, Zap, Lock, Unlock,
    Filter, Search, Square, RotateCcw, ArrowRight,
    Trash2, Check,
} from 'lucide-react';
import './FabricIntegrityCenter.css';
import FabricBlockchainVisualizer from './FabricBlockchainVisualizer';

const rawApiBase = import.meta.env.VITE_API_URL || '';
const API_BASE = rawApiBase.replace(/\/api\/?$/, '');

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function apiFetch(path, token, options = {}) {
    const effectiveToken = token || localStorage.getItem('adminToken') || localStorage.getItem('auditorToken') || localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (effectiveToken && effectiveToken !== 'undefined' && effectiveToken !== 'null') {
        headers['Authorization'] = `Bearer ${effectiveToken}`;
    }
    const res = await fetch(`${API_BASE}/api/integrity${path}`, {
        headers,
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, data });
    return data;
}

// ---------------------------------------------------------------------------
// Status badge component
// ---------------------------------------------------------------------------
function StatusBadge({ status }) {
    const map = {
        LOADING: { color: 'brand', icon: <Loader2 size={12} className="spin" />, label: 'CONNECTING...' },
        CONNECTED: { color: 'success', icon: <CheckCircle size={12} />, label: 'CONNECTED' },
        DISCONNECTED: { color: 'danger', icon: <XCircle size={12} />, label: 'DISCONNECTED' },
        FABRIC_DISABLED: { color: 'muted', icon: <ShieldOff size={12} />, label: 'DISABLED' },
        CONFIRMED: { color: 'success', icon: <CheckCircle size={12} />, label: 'CONFIRMED' },
        PENDING: { color: 'warning', icon: <Clock size={12} />, label: 'PENDING' },
        PROCESSING: { color: 'brand', icon: <Loader2 size={12} className="spin" />, label: 'PROCESSING' },
        FAILED: { color: 'danger', icon: <XCircle size={12} />, label: 'FAILED' },
        INTEGRITY_VERIFIED: { color: 'success', icon: <ShieldCheck size={12} />, label: 'INTEGRITY VERIFIED' },
        HASH_MISMATCH: { color: 'danger', icon: <ShieldAlert size={12} />, label: 'HASH MISMATCH' },
        COMMITMENT_NOT_FOUND: { color: 'warning', icon: <AlertTriangle size={12} />, label: 'NOT COMMITTED' },
        ENTITY_NOT_FOUND: { color: 'muted', icon: <AlertCircle size={12} />, label: 'NOT FOUND' },
        FABRIC_ERROR: { color: 'danger', icon: <AlertTriangle size={12} />, label: 'FABRIC ERROR' },
        VERIFIED: { color: 'success', icon: <ShieldCheck size={12} />, label: 'VERIFIED' },
        TAMPERED: { color: 'danger', icon: <ShieldAlert size={12} />, label: 'TAMPERED' },
        UNVERIFIABLE: { color: 'warning', icon: <AlertCircle size={12} />, label: 'UNVERIFIABLE' },
        SKIPPED: { color: 'muted', icon: <Info size={12} />, label: 'SKIPPED' },
        ERROR: { color: 'danger', icon: <XCircle size={12} />, label: 'ERROR' },
    };
    const config = map[status] || { color: 'muted', icon: <Info size={12} />, label: status };
    return (
        <span className={`fi-badge fi-badge-${config.color}`}>
            {config.icon}
            {config.label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Hash display (truncated with tooltip)
// ---------------------------------------------------------------------------
function HashDisplay({ hash, label }) {
    if (!hash) return <span className="fi-hash-empty">—</span>;
    return (
        <span className="fi-hash" title={hash}>
            {label && <span className="fi-hash-label">{label}: </span>}
            <code>{hash.slice(0, 8)}…{hash.slice(-8)}</code>
        </span>
    );
}

// ---------------------------------------------------------------------------
// Tamper Alerts Panel — auto polls every 30 seconds
// ---------------------------------------------------------------------------
function TamperAlertsPanel({ token, onAlertsUpdated }) {
    const [alerts, setAlerts] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [viewMode, setViewMode] = useState('incidents'); // 'incidents' | 'deliveries'
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async () => {
        try {
            const data = await apiFetch('/alerts', token);
            setAlerts(data.alerts || []);
            setDeliveries(data.deliveries || []);
        } catch (err) {
            console.error('[TamperAlertsPanel] Failed to load alerts:', err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        load();
        // Auto-poll every 30 seconds for new tamper events
        const interval = setInterval(load, 30_000);
        return () => clearInterval(interval);
    }, [load]);

    const handleAcknowledgeAll = async () => {
        try {
            setBusyId('ack-all');
            await apiFetch('/alerts/dismiss', token, {
                method: 'POST',
                body: JSON.stringify({ dismissAll: true })
            });
            await load();
            onAlertsUpdated?.();
        } catch (err) {
            console.error('Failed to acknowledge all alerts:', err);
        } finally {
            setBusyId(null);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm("Permanently clear all tamper breach alert records from the database?")) return;
        try {
            setBusyId('clear-all');
            await apiFetch('/alerts', token, {
                method: 'DELETE',
                body: JSON.stringify({ clearAll: true })
            });
            await load();
            onAlertsUpdated?.();
        } catch (err) {
            console.error('Failed to clear tamper alerts:', err);
        } finally {
            setBusyId(null);
        }
    };

    const handleAcknowledgeIncident = async (incident, idx) => {
        try {
            setBusyId(`ack-${idx}`);
            const deliveryIds = (incident.recipients || []).map(r => r._id);
            await apiFetch('/alerts/dismiss', token, {
                method: 'POST',
                body: JSON.stringify({ deliveryIds })
            });
            await load();
            onAlertsUpdated?.();
        } catch (err) {
            console.error('Failed to acknowledge incident:', err);
        } finally {
            setBusyId(null);
        }
    };

    const handleDeleteIncident = async (incident, idx) => {
        if (!window.confirm(`Delete Incident #${idx + 1} from tamper records?`)) return;
        try {
            setBusyId(`del-${idx}`);
            const deliveryIds = (incident.recipients || []).map(r => r._id);
            await apiFetch('/alerts', token, {
                method: 'DELETE',
                body: JSON.stringify({ deliveryIds })
            });
            await load();
            onAlertsUpdated?.();
        } catch (err) {
            console.error('Failed to delete incident:', err);
        } finally {
            setBusyId(null);
        }
    };

    const handleAcknowledgeDelivery = async (deliveryId) => {
        try {
            setBusyId(`ack-del-${deliveryId}`);
            await apiFetch('/alerts/dismiss', token, {
                method: 'POST',
                body: JSON.stringify({ deliveryIds: [deliveryId] })
            });
            await load();
            onAlertsUpdated?.();
        } catch (err) {
            console.error('Failed to acknowledge delivery:', err);
        } finally {
            setBusyId(null);
        }
    };

    const handleDeleteDelivery = async (deliveryId) => {
        if (!window.confirm("Delete this delivery notification record?")) return;
        try {
            setBusyId(`del-del-${deliveryId}`);
            await apiFetch('/alerts', token, {
                method: 'DELETE',
                body: JSON.stringify({ deliveryIds: [deliveryId] })
            });
            await load();
            onAlertsUpdated?.();
        } catch (err) {
            console.error('Failed to delete delivery:', err);
        } finally {
            setBusyId(null);
        }
    };

    if (loading) return null;
    if (alerts.length === 0 && deliveries.length === 0) {
        return (
            <div className="fi-alerts-clean">
                <ShieldCheck size={16} className="fi-icon-success" />
                <span>No tampering detected — all automated integrity checks are clear.</span>
                <button className="fi-refresh-btn" onClick={load} title="Refresh alerts">
                    <RefreshCw size={13} />
                </button>
            </div>
        );
    }

    const activeIncidents = alerts.filter(a => !a.isAcknowledged);
    const activeDeliveries = deliveries.filter(d => !d.isRead);

    return (
        <div className="fi-tamper-panel">
            <div className="fi-tamper-panel-header" onClick={() => setExpanded(v => !v)}>
                <div className="fi-tamper-panel-title">
                    <span className="fi-tamper-pulse" />
                    <BellRing size={18} />
                    <span>
                        {viewMode === 'incidents'
                            ? `${alerts.length} Tampering Incident${alerts.length !== 1 ? 's' : ''} (${activeIncidents.length} Active)`
                            : `All ${deliveries.length} Tampering Notification Deliveries (${activeDeliveries.length} Active)`}
                    </span>
                </div>
                <div className="fi-tamper-panel-actions" onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginRight: 6 }}>
                        <button
                            type="button"
                            className={`btn btn-xs ${viewMode === 'incidents' ? 'btn-primary' : 'btn-ghost'}`}
                            style={{
                                fontSize: 11,
                                padding: '4px 10px',
                                borderRadius: 4,
                                background: viewMode === 'incidents' ? 'var(--brand-primary, #6366f1)' : 'rgba(255, 255, 255, 0.06)',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                cursor: 'pointer'
                            }}
                            onClick={() => setViewMode('incidents')}
                        >
                            Unique Incidents ({alerts.length})
                        </button>
                        <button
                            type="button"
                            className={`btn btn-xs ${viewMode === 'deliveries' ? 'btn-primary' : 'btn-ghost'}`}
                            style={{
                                fontSize: 11,
                                padding: '4px 10px',
                                borderRadius: 4,
                                background: viewMode === 'deliveries' ? 'var(--brand-primary, #6366f1)' : 'rgba(255, 255, 255, 0.06)',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                cursor: 'pointer'
                            }}
                            onClick={() => setViewMode('deliveries')}
                        >
                            All Deliveries ({deliveries.length})
                        </button>
                    </div>

                    {/* Batch Actions */}
                    {activeIncidents.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-xs"
                            style={{
                                fontSize: 11,
                                padding: '4px 10px',
                                borderRadius: 4,
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                marginRight: 6
                            }}
                            disabled={busyId === 'ack-all'}
                            onClick={handleAcknowledgeAll}
                            title="Acknowledge all tamper alerts and dismiss active status"
                        >
                            {busyId === 'ack-all' ? <Loader2 size={11} className="spin" /> : <Check size={11} />}
                            Acknowledge All ({activeIncidents.length})
                        </button>
                    )}

                    <button
                        type="button"
                        className="btn btn-xs"
                        style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            borderRadius: 4,
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#fca5a5',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            marginRight: 6
                        }}
                        disabled={busyId === 'clear-all'}
                        onClick={handleClearAll}
                        title="Permanently clear all tamper records from database"
                    >
                        {busyId === 'clear-all' ? <Loader2 size={11} className="spin" /> : <Trash2 size={11} />}
                        Clear Logs
                    </button>

                    <button className="fi-refresh-btn" onClick={load} title="Refresh alerts">
                        <RefreshCw size={13} />
                    </button>
                    <button className="fi-refresh-btn" onClick={() => setExpanded(v => !v)}>
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>
            {expanded && (
                <div className="fi-tamper-alerts-list">
                    {viewMode === 'incidents' ? (
                        alerts.map((alert, i) => (
                            <div key={i} className="fi-tamper-alert-item" style={{
                                opacity: alert.isAcknowledged ? 0.78 : 1,
                                borderLeft: alert.isAcknowledged ? '3px solid #10b981' : '3px solid #ef4444'
                            }}>
                                <div className="fi-tamper-alert-icon">
                                    {alert.isAcknowledged ? <ShieldCheck size={20} className="fi-icon-success" /> : <ShieldAlert size={20} />}
                                </div>
                                <div className="fi-tamper-alert-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                                        <div className="fi-tamper-alert-title">{alert.title}</div>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            {alert.isAcknowledged ? (
                                                <span style={{ fontSize: 11, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <CheckCircle size={11} /> Acknowledged
                                                </span>
                                            ) : (
                                                <>
                                                    <span style={{ fontSize: 11, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '2px 8px', borderRadius: 4, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                        <span className="fi-tamper-pulse" style={{ width: 6, height: 6 }} /> Active Breach
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs"
                                                        style={{
                                                            fontSize: 11,
                                                            padding: '2px 8px',
                                                            borderRadius: 4,
                                                            background: 'rgba(99, 102, 241, 0.2)',
                                                            color: '#a5b4fc',
                                                            border: '1px solid rgba(99, 102, 241, 0.4)',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 3
                                                        }}
                                                        disabled={busyId === `ack-${i}`}
                                                        onClick={() => handleAcknowledgeIncident(alert, i)}
                                                        title="Acknowledge this incident and dismiss alert"
                                                    >
                                                        {busyId === `ack-${i}` ? <Loader2 size={11} className="spin" /> : <Check size={11} />}
                                                        Acknowledge
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                className="btn btn-xs"
                                                style={{
                                                    fontSize: 11,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    color: '#fca5a5',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    cursor: 'pointer'
                                                }}
                                                disabled={busyId === `del-${i}`}
                                                onClick={() => handleDeleteIncident(alert, i)}
                                                title="Delete this incident record"
                                            >
                                                {busyId === `del-${i}` ? <Loader2 size={11} className="spin" /> : <Trash2 size={11} />}
                                            </button>
                                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                                Incident #{i + 1}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="fi-tamper-alert-message">{alert.message}</div>
                                    <div className="fi-tamper-alert-time" style={{ marginTop: 6 }}>
                                        <Clock size={12} />
                                        {new Date(alert.createdAt).toLocaleString()}
                                    </div>

                                    {/* Broadcast recipients list */}
                                    {alert.recipients && alert.recipients.length > 0 && (
                                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                Delivered to ({alert.recipients.length}):
                                            </span>
                                            {alert.recipients.map((rec, rIdx) => (
                                                <span key={rIdx} style={{
                                                    fontSize: 11,
                                                    padding: '2px 8px',
                                                    borderRadius: 4,
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}>
                                                    <span style={{ fontWeight: 700, color: rec.role === 'Admin' ? '#818cf8' : '#fbbf24' }}>
                                                        [{rec.role}]
                                                    </span>
                                                    <span style={{ color: 'var(--text-primary)' }}>{rec.name && rec.name !== 'Admin' && rec.name !== 'Auditor' ? `${rec.name} — ` : ''}{rec.email}</span>
                                                    {rec.isRead && (
                                                        <span style={{ color: '#34d399', fontSize: 10, fontWeight: 600 }}>✓</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        deliveries.map((d, i) => (
                            <div key={d._id || i} className="fi-tamper-alert-item" style={{
                                opacity: d.isRead ? 0.78 : 1,
                                borderLeft: d.isRead ? '3px solid #10b981' : '3px solid #ef4444'
                            }}>
                                <div className="fi-tamper-alert-icon">
                                    {d.isRead ? <ShieldCheck size={20} className="fi-icon-success" /> : <ShieldAlert size={20} />}
                                </div>
                                <div className="fi-tamper-alert-body">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                                        <div className="fi-tamper-alert-title">{d.title}</div>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            {d.isRead ? (
                                                <span style={{ fontSize: 11, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <CheckCircle size={11} /> Read
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="btn btn-xs"
                                                    style={{
                                                        fontSize: 11,
                                                        padding: '2px 8px',
                                                        borderRadius: 4,
                                                        background: 'rgba(99, 102, 241, 0.2)',
                                                        color: '#a5b4fc',
                                                        border: '1px solid rgba(99, 102, 241, 0.4)',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 3
                                                    }}
                                                    disabled={busyId === `ack-del-${d._id}`}
                                                    onClick={() => handleAcknowledgeDelivery(d._id)}
                                                    title="Mark delivery as read"
                                                >
                                                    {busyId === `ack-del-${d._id}` ? <Loader2 size={11} className="spin" /> : <Check size={11} />}
                                                    Mark Read
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="btn btn-xs"
                                                style={{
                                                    fontSize: 11,
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    color: '#fca5a5',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    cursor: 'pointer'
                                                }}
                                                disabled={busyId === `del-del-${d._id}`}
                                                onClick={() => handleDeleteDelivery(d._id)}
                                                title="Delete delivery record"
                                            >
                                                {busyId === `del-del-${d._id}` ? <Loader2 size={11} className="spin" /> : <Trash2 size={11} />}
                                            </button>
                                            <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 700, background: d.recipientRole === 'Admin' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: d.recipientRole === 'Admin' ? '#818cf8' : '#fbbf24' }}>
                                                {d.recipientRole}
                                            </span>
                                            <code style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: 3 }}>
                                                ID: {d._id?.slice(-6)}
                                            </code>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                        <strong>Recipient:</strong> {d.recipientName} ({d.recipientEmail})
                                    </div>
                                    <div className="fi-tamper-alert-message">{d.message}</div>
                                    <div className="fi-tamper-alert-time" style={{ marginTop: 6 }}>
                                        <Clock size={12} />
                                        {new Date(d.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Network Status Card
// ---------------------------------------------------------------------------
function NetworkStatusCard({ status, onRefresh, loading }) {
    const isConnected = status?.connected;
    const isEnabled = status?.enabled;

    return (
        <div className={`fi-card fi-network-card ${isConnected ? 'fi-card-connected' : isEnabled ? 'fi-card-disconnected' : 'fi-card-disabled'}`}>
            <div className="fi-card-header">
                <div className="fi-card-title-row">
                    {isConnected
                        ? <Network size={20} className="fi-icon-success" />
                        : isEnabled
                            ? <Network size={20} className="fi-icon-danger" />
                            : <Network size={20} className="fi-icon-muted" />
                    }
                    <h3>Fabric Network Status</h3>
                    <button className="fi-refresh-btn" onClick={onRefresh} disabled={loading}>
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    </button>
                </div>
                <StatusBadge status={(!status || loading) ? 'LOADING' : isConnected ? 'CONNECTED' : isEnabled ? 'DISCONNECTED' : 'FABRIC_DISABLED'} />
            </div>
            <div className="fi-card-body">
                <div className="fi-data-grid">
                    <div className="fi-data-row">
                        <span className="fi-data-label">Channel</span>
                        <code className="fi-data-value">{status?.channel || '—'}</code>
                    </div>
                    <div className="fi-data-row">
                        <span className="fi-data-label">Chaincode</span>
                        <code className="fi-data-value">{status?.chaincode || '—'}</code>
                    </div>
                    <div className="fi-data-row">
                        <span className="fi-data-label">MSP ID</span>
                        <code className="fi-data-value">{status?.mspId || '—'}</code>
                    </div>
                    <div className="fi-data-row">
                        <span className="fi-data-label">Peer</span>
                        <code className="fi-data-value">{status?.peerEndpoint || '—'}</code>
                    </div>
                </div>
                {!loading && status && !isEnabled && (
                    <div className="fi-notice fi-notice-info">
                        <Info size={14} />
                        Fabric integration is disabled. Set <code>FABRIC_ENABLED=true</code> and start the network to enable integrity commitments.
                    </div>
                )}
                {status && isEnabled && !isConnected && status?.error && (
                    <div className="fi-notice fi-notice-danger">
                        <AlertTriangle size={14} />
                        {status.error}
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Ledger Stats
// ---------------------------------------------------------------------------
function LedgerStatsRow({ height, commitments, tamperCount }) {
    return (
        <div className="fi-stats-row">
            <div className="fi-stat-card">
                <Layers size={18} className="fi-icon-brand" />
                <div>
                    <div className="fi-stat-value">{height?.height ?? '—'}</div>
                    <div className="fi-stat-label">Ledger Height</div>
                </div>
            </div>
            <div className="fi-stat-card">
                <Database size={18} className="fi-icon-brand" />
                <div>
                    <div className="fi-stat-value">{commitments?.length ?? '—'}</div>
                    <div className="fi-stat-label">Commitments</div>
                </div>
            </div>
            <div className={`fi-stat-card ${tamperCount > 0 ? 'fi-stat-danger' : ''}`}>
                {tamperCount > 0 ? <ShieldAlert size={18} className="fi-icon-danger" /> : <ShieldCheck size={18} className="fi-icon-success" />}
                <div>
                    <div className={`fi-stat-value ${tamperCount > 0 ? 'fi-text-danger' : ''}`}>{tamperCount ?? '—'}</div>
                    <div className="fi-stat-label">Tamper Alerts</div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Verify Ledger Panel — bulk block-by-block verification
// ---------------------------------------------------------------------------
function VerifyLedgerPanel({ token }) {
    const [state, setState] = useState('idle'); // idle | running | done | error
    const [report, setReport] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [expandedRow, setExpandedRow] = useState(null);
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'VERIFIED' | 'TAMPERED' | 'UNVERIFIABLE'
    const [entityFilter, setEntityFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const resultsRef = useRef(null);

    const handleVerify = async () => {
        setState('running');
        setReport(null);
        setErrorMsg(null);
        try {
            const data = await apiFetch('/verify-ledger', token, { method: 'POST' });
            setReport(data);
            setState('done');
            // Scroll to results
            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (err) {
            setErrorMsg(err.message);
            setState('error');
        }
    };

    const summary = report?.summary;
    const allClean = summary && summary.tampered === 0 && summary.verified > 0;

    // Filter counts
    const counts = useMemo(() => {
        if (!report?.results) return { all: 0, verified: 0, tampered: 0, unverifiable: 0 };
        return {
            all: report.results.length,
            verified: report.results.filter(r => r.status === 'VERIFIED').length,
            tampered: report.results.filter(r => r.status === 'TAMPERED').length,
            unverifiable: report.results.filter(r => r.status !== 'VERIFIED' && r.status !== 'TAMPERED').length,
        };
    }, [report]);

    // Available entity types
    const entityTypes = useMemo(() => {
        if (!report?.results) return [];
        return Array.from(new Set(report.results.map(r => r.entityType).filter(Boolean)));
    }, [report]);

    // Filtered results
    const filteredResults = useMemo(() => {
        if (!report?.results) return [];
        return report.results.filter(r => {
            if (statusFilter === 'VERIFIED' && r.status !== 'VERIFIED') return false;
            if (statusFilter === 'TAMPERED' && r.status !== 'TAMPERED') return false;
            if (statusFilter === 'UNVERIFIABLE' && (r.status === 'VERIFIED' || r.status === 'TAMPERED')) return false;

            if (entityFilter !== 'ALL' && r.entityType !== entityFilter) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchCommitment = r.commitmentId?.toLowerCase().includes(q);
                const matchEntityId = r.entityId?.toLowerCase().includes(q);
                const matchType = r.entityType?.toLowerCase().includes(q);
                const matchTx = r.fabricTxId?.toLowerCase().includes(q);
                if (!matchCommitment && !matchEntityId && !matchType && !matchTx) return false;
            }

            return true;
        });
    }, [report, statusFilter, entityFilter, searchQuery]);

    return (
        <div className="fi-vl-panel">
            {/* Hero */}
            <div className="fi-vl-hero">
                <div className="fi-vl-hero-icon">
                    <ScanLine size={32} />
                </div>
                <div className="fi-vl-hero-text">
                    <h2>Ledger Integrity Scan</h2>
                    <p>
                        Iterates through every committed record on the Hyperledger Fabric ledger,
                        recomputes the SHA-256 hash from live MongoDB data, and compares it against
                        the immutable Fabric commitment. Any hash mismatch reveals unauthorized tampering.
                    </p>
                </div>
                <button
                    className={`fi-vl-run-btn ${state === 'running' ? 'fi-vl-run-btn-running' : ''}`}
                    onClick={handleVerify}
                    disabled={state === 'running'}
                >
                    {state === 'running' ? (
                        <><Loader2 size={18} className="spin" /> Scanning…</>
                    ) : (
                        <><Play size={18} /> Verify Ledger</>
                    )}
                </button>
            </div>

            {state === 'running' && (
                <div className="fi-vl-progress">
                    <div className="fi-vl-progress-bar">
                        <div className="fi-vl-progress-fill" />
                    </div>
                    <span className="fi-vl-progress-label">
                        <Loader2 size={13} className="spin" />
                        Verifying all commitments against Hyperledger Fabric…
                    </span>
                </div>
            )}

            {state === 'error' && (
                <div className="fi-notice fi-notice-danger" style={{ marginTop: '20px' }}>
                    <XCircle size={16} /> {errorMsg}
                </div>
            )}

            {state === 'done' && report && (
                <div ref={resultsRef}>
                    {/* Summary Banner */}
                    <div className={`fi-vl-summary ${allClean ? 'fi-vl-summary-clean' : summary.tampered > 0 ? 'fi-vl-summary-breach' : 'fi-vl-summary-warn'}`}>
                        <div className="fi-vl-summary-icon">
                            {allClean ? <ShieldCheck size={36} /> : summary.tampered > 0 ? <ShieldAlert size={36} /> : <Shield size={36} />}
                        </div>
                        <div className="fi-vl-summary-text">
                            <div className="fi-vl-summary-title">
                                {allClean
                                    ? '✓ All commitments verified — ledger is intact'
                                    : summary.tampered > 0
                                        ? `⚠ ${summary.tampered} tampered record${summary.tampered !== 1 ? 's' : ''} detected!`
                                        : 'Verification complete with warnings'}
                            </div>
                            <div className="fi-vl-summary-subtitle">
                                Scanned {summary.total} commitment{summary.total !== 1 ? 's' : ''} ·{' '}
                                <span className="fi-text-success">{summary.verified} verified</span> ·{' '}
                                {summary.tampered > 0 && <span className="fi-text-danger">{summary.tampered} tampered · </span>}
                                {summary.skipped > 0 && <span className="fi-text-muted">{summary.skipped} skipped · </span>}
                                Scanned at {new Date(report.verifiedAt).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    {!report.fabricEnabled && (
                        <div className="fi-notice fi-notice-info" style={{ marginTop: 16 }}>
                            <Info size={14} /> {report.message}
                        </div>
                    )}

                    {/* Per-commitment Results */}
                    {report.results?.length > 0 && (
                        <div className="fi-vl-results">
                            <div className="fi-vl-results-header">
                                <div className="fi-vl-header-title-row">
                                    <Hash size={16} className="fi-icon-brand" />
                                    <h3>Block-by-Block Verification Results</h3>
                                    <span className="fi-vl-results-count">
                                        Showing {filteredResults.length} of {report.results.length} records
                                    </span>
                                </div>
                            </div>

                            {/* Filters Bar */}
                            <div className="fi-vl-filter-bar">
                                <div className="fi-vl-filter-group">
                                    {/* Status Pills */}
                                    <div className="fi-filter-pills">
                                        <button
                                            type="button"
                                            className={`fi-filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
                                            onClick={() => setStatusFilter('ALL')}
                                        >
                                            All <span className="fi-pill-count">{counts.all}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`fi-filter-pill fi-filter-pill-verified ${statusFilter === 'VERIFIED' ? 'active' : ''}`}
                                            onClick={() => setStatusFilter('VERIFIED')}
                                        >
                                            <ShieldCheck size={13} />
                                            Verified <span className="fi-pill-count">{counts.verified}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`fi-filter-pill fi-filter-pill-tampered ${statusFilter === 'TAMPERED' ? 'active' : ''}`}
                                            onClick={() => setStatusFilter('TAMPERED')}
                                        >
                                            <ShieldAlert size={13} />
                                            Tampered <span className="fi-pill-count">{counts.tampered}</span>
                                        </button>
                                        {counts.unverifiable > 0 && (
                                            <button
                                                type="button"
                                                className={`fi-filter-pill fi-filter-pill-warn ${statusFilter === 'UNVERIFIABLE' ? 'active' : ''}`}
                                                onClick={() => setStatusFilter('UNVERIFIABLE')}
                                            >
                                                <AlertCircle size={13} />
                                                Unverifiable <span className="fi-pill-count">{counts.unverifiable}</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Entity Type Filter */}
                                    {entityTypes.length > 1 && (
                                        <div className="fi-entity-filter-wrapper">
                                            <Filter size={13} className="fi-icon-muted" />
                                            <select
                                                className="fi-select fi-select-sm"
                                                value={entityFilter}
                                                onChange={(e) => setEntityFilter(e.target.value)}
                                            >
                                                <option value="ALL">All Types ({report.results.length})</option>
                                                {entityTypes.map(t => (
                                                    <option key={t} value={t}>
                                                        {t} ({report.results.filter(r => r.entityType === t).length})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Search Bar */}
                                <div className="fi-vl-search-wrapper">
                                    <Search size={14} className="fi-search-icon" />
                                    <input
                                        type="text"
                                        className="fi-search-input"
                                        placeholder="Search by ID or type..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searchQuery && (
                                        <button className="fi-search-clear" onClick={() => setSearchQuery('')}>×</button>
                                    )}
                                </div>
                            </div>

                            <div className="fi-vl-results-list">
                                {filteredResults.length === 0 ? (
                                    <div className="fi-empty" style={{ padding: '36px 20px' }}>
                                        <Filter size={24} className="fi-icon-muted" />
                                        <p>No commitments match the active filter criteria.</p>
                                        <button
                                            type="button"
                                            className="fi-btn fi-btn-secondary fi-btn-sm"
                                            onClick={() => { setStatusFilter('ALL'); setEntityFilter('ALL'); setSearchQuery(''); }}
                                            style={{ marginTop: 8 }}
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                ) : (
                                    filteredResults.map((r, i) => {
                                        const isOpen = expandedRow === i;
                                        const isTampered = r.status === 'TAMPERED';
                                        const isVerified = r.status === 'VERIFIED';
                                        return (
                                            <div
                                                key={i}
                                                className={`fi-vl-row ${isTampered ? 'fi-vl-row-tampered' : isVerified ? 'fi-vl-row-verified' : 'fi-vl-row-warn'}`}
                                            >
                                                <div
                                                    className="fi-vl-row-main"
                                                    onClick={() => setExpandedRow(isOpen ? null : i)}
                                                >
                                                    <div className="fi-vl-row-status-icon">
                                                        {isVerified && <ShieldCheck size={18} className="fi-icon-success" />}
                                                        {isTampered && <ShieldAlert size={18} className="fi-icon-danger" />}
                                                        {!isVerified && !isTampered && <AlertCircle size={18} className="fi-icon-warning" />}
                                                    </div>
                                                    <div className="fi-vl-row-info">
                                                        <div className="fi-vl-row-entity">
                                                            <span className="fi-type-badge fi-type-entity">{r.entityType}</span>
                                                            <code className="fi-code-sm">{r.entityId?.slice(0, 12)}…</code>
                                                        </div>
                                                        <div className="fi-vl-row-commitment">
                                                            <code className="fi-code-xs">{r.commitmentId}</code>
                                                        </div>
                                                    </div>
                                                    <div className="fi-vl-row-right">
                                                        <StatusBadge status={r.status} />
                                                        {isOpen ? <ChevronUp size={14} className="fi-vl-expand-icon" /> : <ChevronDown size={14} className="fi-vl-expand-icon" />}
                                                    </div>
                                                </div>

                                                {isOpen && (
                                                    <div className="fi-vl-row-detail">
                                                        <div className="fi-data-grid">
                                                            <div className="fi-data-row">
                                                                <span className="fi-data-label">Entity Type</span>
                                                                <span className="fi-data-value">{r.entityType}</span>
                                                            </div>
                                                            <div className="fi-data-row">
                                                                <span className="fi-data-label">Entity ID</span>
                                                                <code className="fi-data-value fi-code-sm">{r.entityId}</code>
                                                            </div>
                                                            <div className="fi-data-row">
                                                                <span className="fi-data-label">Commitment ID</span>
                                                                <code className="fi-data-value fi-code-sm">{r.commitmentId}</code>
                                                            </div>
                                                            {r.computedHash && (
                                                                <div className="fi-data-row">
                                                                    <span className="fi-data-label">
                                                                        <Database size={12} style={{ display: 'inline', marginRight: 4 }} />
                                                                        MongoDB Hash
                                                                    </span>
                                                                    <code className={`fi-data-value fi-code-hash ${isTampered ? 'fi-text-danger' : ''}`}>{r.computedHash}</code>
                                                                </div>
                                                            )}
                                                            {r.ledgerHash && (
                                                                <div className="fi-data-row">
                                                                    <span className="fi-data-label">
                                                                        <Lock size={12} style={{ display: 'inline', marginRight: 4 }} />
                                                                        Fabric Ledger Hash
                                                                    </span>
                                                                    <code className={`fi-data-value fi-code-hash ${isTampered ? 'fi-text-danger' : 'fi-text-success'}`}>{r.ledgerHash}</code>
                                                                </div>
                                                            )}
                                                            {r.fabricTxId && (
                                                                <div className="fi-data-row">
                                                                    <span className="fi-data-label">Tx ID</span>
                                                                    <code className="fi-data-value fi-code-sm">{r.fabricTxId?.slice(0, 20)}…</code>
                                                                </div>
                                                            )}
                                                            {r.fabricBlockTimestamp && (
                                                                <div className="fi-data-row">
                                                                    <span className="fi-data-label">Block Timestamp</span>
                                                                    <span className="fi-data-value">{new Date(r.fabricBlockTimestamp).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                            {r.reason && (
                                                                <div className="fi-data-row">
                                                                    <span className="fi-data-label">Reason</span>
                                                                    <span className="fi-data-value fi-text-secondary">{r.reason}</span>
                                                                </div>
                                                            )}
                                                            {r.message && (
                                                                <div className="fi-data-row">
                                                                    <span className="fi-data-label">Message</span>
                                                                    <span className="fi-data-value fi-text-secondary">{r.message}</span>
                                                                </div>
                                                            )}
                                                            {r.verifiedAt && (
                                                                <div className="fi-data-row">
                                                                    <span className="fi-data-label">Verified At</span>
                                                                    <span className="fi-data-value">{new Date(r.verifiedAt).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isTampered && (
                                                            <div className="fi-notice fi-notice-danger fi-mismatch-warning" style={{ marginTop: 12 }}>
                                                                <ShieldAlert size={16} />
                                                                <strong>⚠ INTEGRITY VIOLATION</strong>
                                                                The MongoDB-computed hash does not match the immutable Fabric commitment.
                                                                This indicates the database record was modified after being committed to the ledger.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Recent Commitments Table
// ---------------------------------------------------------------------------
function RecentCommitmentsTable({ commitments, loading, onVerify }) {
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const allowedTypes = useMemo(() => new Set(['BATCH_COMMITMENT', 'RESULT_COMMITMENT', 'EXAM_COMMITMENT', 'SECURITY_EVENT']), []);

    const validCommitments = useMemo(() => {
        if (!commitments) return [];
        return commitments.filter(c => allowedTypes.has(c.eventType));
    }, [commitments, allowedTypes]);

    const availableTypes = useMemo(() => {
        if (!validCommitments) return [];
        return Array.from(new Set(validCommitments.map(c => c.eventType).filter(Boolean)));
    }, [validCommitments]);

    // Reset page to 1 whenever filters or page size change
    useEffect(() => {
        setCurrentPage(1);
    }, [typeFilter, searchQuery, pageSize]);

    const filtered = useMemo(() => {
        if (!validCommitments) return [];
        return validCommitments.filter(c => {
            if (typeFilter !== 'ALL' && c.eventType !== typeFilter) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchId = c.id?.toLowerCase().includes(q);
                const matchEntityId = c.entityId?.toLowerCase().includes(q);
                const matchHash = c.dataHash?.toLowerCase().includes(q);
                const matchType = c.eventType?.toLowerCase().includes(q);
                if (!matchId && !matchEntityId && !matchHash && !matchType) return false;
            }
            return true;
        });
    }, [validCommitments, typeFilter, searchQuery]);

    const totalRecords = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const validCurrentPage = Math.min(currentPage, totalPages);

    const paginatedCommitments = useMemo(() => {
        const start = (validCurrentPage - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, validCurrentPage, pageSize]);

    const pageNumbers = useMemo(() => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (validCurrentPage <= 4) {
            return [1, 2, 3, 4, 5, '...', totalPages];
        }
        if (validCurrentPage >= totalPages - 3) {
            return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', totalPages];
    }, [totalPages, validCurrentPage]);

    if (loading) return (
        <div className="fi-loading-row">
            <Loader2 size={16} className="spin" /> Loading commitments...
        </div>
    );
    if (!validCommitments || validCommitments.length === 0) return (
        <div className="fi-empty">
            <Database size={32} className="fi-icon-muted" />
            <p>No commitments on ledger yet.</p>
        </div>
    );

    return (
        <div className="fi-table-container">
            {/* Filter Bar */}
            <div className="fi-vl-filter-bar" style={{ marginBottom: 12, borderRadius: 'var(--radius-lg)' }}>
                <div className="fi-vl-filter-group">
                    <div className="fi-filter-pills">
                        <button
                            type="button"
                            className={`fi-filter-pill ${typeFilter === 'ALL' ? 'active' : ''}`}
                            onClick={() => setTypeFilter('ALL')}
                        >
                            All Types <span className="fi-pill-count">{validCommitments.length}</span>
                        </button>
                        {availableTypes.map(t => (
                            <button
                                key={t}
                                type="button"
                                className={`fi-filter-pill ${typeFilter === t ? 'active' : ''}`}
                                onClick={() => setTypeFilter(t)}
                            >
                                {t.replace('_COMMITMENT', '')} <span className="fi-pill-count">{validCommitments.filter(c => c.eventType === t).length}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="fi-vl-search-wrapper">
                    <Search size={14} className="fi-search-icon" />
                    <input
                        type="text"
                        className="fi-search-input"
                        placeholder="Search commitments..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="fi-search-clear" onClick={() => setSearchQuery('')}>×</button>
                    )}
                </div>
            </div>

            <div className="fi-table-wrapper">
                <table className="fi-table">
                    <thead>
                        <tr>
                            <th>Commitment ID</th>
                            <th>Type</th>
                            <th>Entity</th>
                            <th>Data Hash</th>
                            <th>Block Timestamp</th>
                            <th>Version</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedCommitments.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="fi-center" style={{ padding: '30px' }}>
                                    <div className="fi-empty">
                                        <Filter size={20} className="fi-icon-muted" />
                                        <p>No commitments match this filter.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedCommitments.map((c, i) => {
                                const commitmentId = c.id || c.commitmentId || '';
                                const entityId = c.entityId || c.entity_id || '';
                                return (
                                    <tr key={commitmentId || i} className="fi-table-row">
                                        <td>
                                            <code className="fi-code-sm" title={commitmentId}>
                                                {commitmentId ? (commitmentId.length > 24 ? `${commitmentId.slice(0, 24)}…` : commitmentId) : '—'}
                                            </code>
                                        </td>
                                        <td>
                                            <span className={`fi-type-badge fi-type-${c.eventType?.toLowerCase().replace('_', '-')}`}>
                                                {c.eventType?.replace('_COMMITMENT', '') || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <code className="fi-code-sm" title={entityId}>
                                                {entityId ? (entityId.length > 12 ? `${entityId.slice(0, 12)}…` : entityId) : '—'}
                                            </code>
                                        </td>
                                        <td><HashDisplay hash={c.dataHash} /></td>
                                        <td className="fi-timestamp">{c.blockTimestamp ? new Date(c.blockTimestamp).toLocaleString() : '—'}</td>
                                        <td className="fi-center">v{c.version ?? 1}</td>
                                        <td className="fi-center">
                                            <button
                                                className="fi-btn fi-btn-secondary fi-btn-sm"
                                                onClick={() => onVerify(c)}
                                                title="Verify Integrity"
                                            >
                                                <ShieldCheck size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalRecords > 0 && (
                <div className="fi-pagination-bar">
                    <div className="fi-pagination-left">
                        <span className="fi-pagination-summary">
                            Showing <strong>{((validCurrentPage - 1) * pageSize) + 1}</strong> – <strong>{Math.min(validCurrentPage * pageSize, totalRecords)}</strong> of <strong>{totalRecords}</strong> commitments
                        </span>

                        <div className="fi-pagination-size">
                            <span>Per page:</span>
                            <select
                                className="fi-select fi-select-sm"
                                style={{ minWidth: 64, height: 28, padding: '2px 8px', fontSize: '0.78rem' }}
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>

                    <div className="fi-pagination-controls">
                        <button
                            type="button"
                            className="fi-page-btn"
                            disabled={validCurrentPage <= 1}
                            onClick={() => setCurrentPage(1)}
                            title="First page"
                        >
                            «
                        </button>
                        <button
                            type="button"
                            className="fi-page-btn"
                            disabled={validCurrentPage <= 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            title="Previous page"
                        >
                            ‹
                        </button>

                        <div className="fi-pagination-numbers">
                            {pageNumbers.map((p, idx) => (
                                p === '...' ? (
                                    <span key={`dots-${idx}`} className="fi-page-dots">…</span>
                                ) : (
                                    <button
                                        key={p}
                                        type="button"
                                        className={`fi-page-btn ${p === validCurrentPage ? 'active' : ''}`}
                                        onClick={() => setCurrentPage(p)}
                                    >
                                        {p}
                                    </button>
                                )
                            ))}
                        </div>

                        <button
                            type="button"
                            className="fi-page-btn"
                            disabled={validCurrentPage >= totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            title="Next page"
                        >
                            ›
                        </button>
                        <button
                            type="button"
                            className="fi-page-btn"
                            disabled={validCurrentPage >= totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            title="Last page"
                        >
                            »
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Outbox Re-commit & Sync Panel
// ---------------------------------------------------------------------------
function OutboxRecommitPanel({ token, fabricStatus, ledgerHeight, onRefreshStatus, onNavigateTab }) {
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [job, setJob] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState(null);
    const [reconnectLoading, setReconnectLoading] = useState(false);
    const [reconnectMsg, setReconnectMsg] = useState(null);
    const [selectedMode, setSelectedMode] = useState('core');
    const [confirmModal, setConfirmModal] = useState(false);

    const loadStats = useCallback(async () => {
        try {
            const data = await apiFetch('/outbox/stats', token);
            setStats(data);
            if (data.recommitJob) setJob(data.recommitJob);
        } catch (err) {
            console.error('[OutboxRecommitPanel] Failed to load outbox stats:', err.message);
        } finally {
            setLoadingStats(false);
        }
    }, [token]);

    const pollJobStatus = useCallback(async () => {
        try {
            const data = await apiFetch('/outbox/recommit-status', token);
            setJob(data.job);
            if (data.job?.status !== 'running') {
                loadStats();
                if (onRefreshStatus) onRefreshStatus();
            }
        } catch (_) { }
    }, [token, loadStats, onRefreshStatus]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    // Live polling when job is running
    useEffect(() => {
        if (job?.status === 'running') {
            const timer = setInterval(pollJobStatus, 1200);
            return () => clearInterval(timer);
        }
    }, [job?.status, pollJobStatus]);

    const handleStart = async (mode) => {
        setActionLoading(true);
        setActionError(null);
        setConfirmModal(false);
        try {
            const res = await apiFetch('/outbox/recommit', token, {
                method: 'POST',
                body: JSON.stringify({ mode, resetDb: true }),
            });
            if (res.job) setJob(res.job);
            loadStats();
        } catch (err) {
            setActionError(err.message || 'Failed to start recommit.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStop = async () => {
        try {
            await apiFetch('/outbox/recommit-stop', token, { method: 'POST' });
            pollJobStatus();
        } catch (err) {
            setActionError(err.message);
        }
    };

    const handleReconnect = async () => {
        setReconnectLoading(true);
        setReconnectMsg(null);
        setActionError(null);
        try {
            await apiFetch('/fabric/reconnect', token, { method: 'POST' });
            setReconnectMsg('Fabric Gateway successfully reconnected with fresh TLS credentials!');
            if (onRefreshStatus) onRefreshStatus();
            loadStats();
        } catch (err) {
            setActionError(`Reconnection failed: ${err.message}`);
        } finally {
            setReconnectLoading(false);
        }
    };

    const isRunning = job?.status === 'running';
    const percent = job && job.total > 0 ? Math.min(100, Math.round((job.processed / job.total) * 100)) : 0;
    const currentHeight = ledgerHeight?.height ?? stats?.ledgerHeight ?? 0;
    const isOutOfSync = currentHeight === 0 && (stats?.confirmed > 0 || stats?.total > 0);

    return (
        <div className="fi-recommit-panel">
            {/* Hero */}
            <div className="fi-recommit-hero">
                <div className="fi-recommit-hero-icon">
                    <RefreshCw size={28} className={isRunning ? 'spin' : ''} />
                </div>
                <div className="fi-recommit-hero-text">
                    <h2>Ledger Re-Commit & Outbox Synchronizer</h2>
                    <p>
                        When Hyperledger Fabric is taken down and restarted (<code>npm run fabric:down</code> → <code>npm run fabric:up</code>),
                        its blockchain ledger resets to block height 0. Use this manager to re-anchor historical question batches,
                        exam papers, and student results from MongoDB back onto the newly deployed Fabric network.
                    </p>
                </div>
            </div>

            {/* Out of Sync Warning Alert */}
            {isOutOfSync && (
                <div className="fi-sync-banner">
                    <div className="fi-sync-banner-left">
                        <AlertTriangle size={24} className="fi-icon-warning" style={{ flexShrink: 0 }} />
                        <div className="fi-sync-banner-text">
                            <strong>Blockchain Reset Detected (Ledger Height: 0)</strong>
                            <span>
                                Fabric ledger contains 0 blocks, but MongoDB has {stats?.total || 0} stored commitments.
                                All prior records are currently unanchored on the new blockchain. Click <b>Re-commit Core State</b> or <b>Re-commit All Data</b> below.
                            </span>
                        </div>
                    </div>
                    <button
                        className="fi-btn fi-btn-warning fi-btn-sm"
                        onClick={() => { setSelectedMode('core'); setConfirmModal(true); }}
                        disabled={isRunning || actionLoading}
                    >
                        <Zap size={14} /> Quick Sync Core
                    </button>
                </div>
            )}

            {/* Error / Success Notifications */}
            {actionError && (
                <div className="fi-notice fi-notice-danger">
                    <AlertCircle size={16} />
                    <span>{actionError}</span>
                </div>
            )}
            {reconnectMsg && (
                <div className="fi-notice fi-notice-success">
                    <CheckCircle size={16} />
                    <span>{reconnectMsg}</span>
                </div>
            )}

            {/* Stats Matrix */}
            <div className="fi-recommit-stats-grid">
                <div className="fi-recommit-stat-card">
                    <div className="fi-recommit-stat-icon">
                        <Layers size={22} />
                    </div>
                    <div>
                        <div className="fi-recommit-stat-val">{currentHeight}</div>
                        <div className="fi-recommit-stat-lbl">Fabric Ledger Height</div>
                    </div>
                </div>

                <div className="fi-recommit-stat-card">
                    <div className="fi-recommit-stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                        <Database size={22} />
                    </div>
                    <div>
                        <div className="fi-recommit-stat-val">{stats?.total ?? '—'}</div>
                        <div className="fi-recommit-stat-lbl">MongoDB Outbox Total</div>
                    </div>
                </div>

                <div className="fi-recommit-stat-card">
                    <div className="fi-recommit-stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <div className="fi-recommit-stat-val">{stats?.confirmed ?? '—'}</div>
                        <div className="fi-recommit-stat-lbl">Confirmed in DB</div>
                    </div>
                </div>

                <div className="fi-recommit-stat-card">
                    <div className="fi-recommit-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        <Clock size={22} />
                    </div>
                    <div>
                        <div className="fi-recommit-stat-val">{stats?.pending ?? '—'}</div>
                        <div className="fi-recommit-stat-lbl">Pending Anchor</div>
                    </div>
                </div>
            </div>

            {/* Entity Breakdown Pills */}
            <div className="fi-entity-breakdown">
                <span className="fi-entity-breakdown-title">Entities in Outbox Queue:</span>
                <div className="fi-entity-pills-row">
                    <span className="fi-entity-pill">
                        <Box size={14} /> Batches (Merkle Roots):
                        <span className="fi-entity-pill-count">{stats?.byType?.Batch || 0}</span>
                    </span>
                    <span className="fi-entity-pill">
                        <Shield size={14} /> Exam Papers:
                        <span className="fi-entity-pill-count">{stats?.byType?.Exam || 0}</span>
                    </span>
                    <span className="fi-entity-pill">
                        <Activity size={14} /> Student Results:
                        <span className="fi-entity-pill-count">{stats?.byType?.Result || 0}</span>
                    </span>
                    <span className="fi-entity-pill">
                        <Lock size={14} /> Security Events:
                        <span className="fi-entity-pill-count">{stats?.byType?.SecurityEvent || 0}</span>
                    </span>
                </div>
            </div>

            {/* Active Recommit Job Monitor Card */}
            {job && job.status !== 'idle' && (
                <div className="fi-job-monitor-card">
                    <div className="fi-job-monitor-header">
                        <div className="fi-job-title-row">
                            <StatusBadge status={job.status === 'running' ? 'PROCESSING' : job.status === 'completed' ? 'CONFIRMED' : job.status === 'stopped' ? 'PENDING' : 'FAILED'} />
                            <h3>
                                {job.status === 'running' && 'Blockchain Anchor in Progress...'}
                                {job.status === 'completed' && 'Recommit Completed Successfully'}
                                {job.status === 'stopped' && 'Recommit Job Halted by User'}
                                {job.status === 'failed' && 'Recommit Job Encountered an Error'}
                            </h3>
                        </div>
                        <div className="fi-job-counters">
                            <span className="fi-counter-tag fi-counter-success">
                                <CheckCircle size={14} /> {job.succeeded} Succeeded
                            </span>
                            {job.failed > 0 && (
                                <span className="fi-counter-tag fi-counter-fail">
                                    <XCircle size={14} /> {job.failed} Failed
                                </span>
                            )}
                            <span className="fi-data-label">
                                Mode: <strong>{job.mode?.toUpperCase()}</strong>
                            </span>
                        </div>
                    </div>

                    <div className="fi-progress-track">
                        <div
                            className={`fi-progress-fill ${job.status === 'running' ? 'running' : ''}`}
                            style={{ width: `${percent}%` }}
                        />
                    </div>

                    <div className="fi-job-meta-row">
                        <div>
                            <strong>{job.processed}</strong> of <strong>{job.total}</strong> commitments processed ({percent}%)
                        </div>
                        <div>
                            {isRunning && (
                                <button className="fi-btn fi-btn-danger fi-btn-sm" onClick={handleStop}>
                                    <Square size={12} /> Stop / Pause Sync
                                </button>
                            )}
                        </div>
                    </div>

                    {isRunning && job.currentCommitment && (
                        <div className="fi-current-item-ticker">
                            <Loader2 size={14} className="spin fi-icon-brand" />
                            <span>
                                Committing item #{job.currentCommitment.count}: <code>{job.currentCommitment.id}</code> ({job.currentCommitment.entityType})
                            </span>
                        </div>
                    )}

                    {job.status === 'completed' && (
                        <div className="fi-sync-completed-card">
                            <div className="fi-sync-completed-left">
                                <CheckCircle size={24} className="fi-icon-success" />
                                <div>
                                    <strong>All requested commitments anchored!</strong>
                                    <p>The new Hyperledger Fabric ledger has been populated. Ledger Height is now <b>{currentHeight}</b>.</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="fi-btn fi-btn-secondary fi-btn-sm" onClick={() => onNavigateTab('commitments')}>
                                    <Database size={13} /> View Ledger
                                </button>
                                <button className="fi-btn fi-btn-primary fi-btn-sm" onClick={() => onNavigateTab('verify-ledger')}>
                                    <ScanLine size={13} /> Run Ledger Verification
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Recommit Action Cards Grid */}
            <div className="fi-recommit-actions-grid">
                {/* Card 1: Core State (Fastest) */}
                <div className="fi-recommit-action-card fi-recommit-action-card-highlight">
                    <div className="fi-action-badge">Recommended for Dev</div>
                    <div className="fi-action-card-top">
                        <div className="fi-action-card-icon">
                            <Zap size={22} />
                        </div>
                        <h3>Re-commit Core State</h3>
                        <p>
                            Re-anchors all Question Batches (Merkle roots), Exam papers, Security Events, and the 100 most recent student results.
                            Completes in ~1-2 minutes. Perfect when developing and testing.
                        </p>
                    </div>
                    <button
                        className="fi-btn fi-btn-primary fi-action-card-btn"
                        onClick={() => { setSelectedMode('core'); setConfirmModal(true); }}
                        disabled={isRunning || actionLoading || !fabricStatus?.connected}
                    >
                        {actionLoading && selectedMode === 'core' ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
                        Re-commit Core State
                    </button>
                </div>

                {/* Card 2: Full Sync (All Commitments) */}
                <div className="fi-recommit-action-card">
                    <div className="fi-action-badge" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.25)' }}>Full Ledger</div>
                    <div className="fi-action-card-top">
                        <div className="fi-action-card-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                            <Database size={22} />
                        </div>
                        <h3>Re-commit All Data</h3>
                        <p>
                            Iterates through every single Question Batch, Exam, and all {stats?.byType?.Result || 0} student results in MongoDB in chronological order.
                            Ensures 100% full historical ledger recreation.
                        </p>
                    </div>
                    <button
                        className="fi-btn fi-btn-secondary fi-action-card-btn"
                        onClick={() => { setSelectedMode('all'); setConfirmModal(true); }}
                        disabled={isRunning || actionLoading || !fabricStatus?.connected}
                    >
                        {actionLoading && selectedMode === 'all' ? <Loader2 size={16} className="spin" /> : <Database size={16} />}
                        Re-commit All ({stats?.total || 0} items)
                    </button>
                </div>

                {/* Card 3: Sync Pending Only */}
                <div className="fi-recommit-action-card">
                    <div className="fi-action-badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.25)' }}>Incremental</div>
                    <div className="fi-action-card-top">
                        <div className="fi-action-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                            <Clock size={22} />
                        </div>
                        <h3>Sync Pending Only</h3>
                        <p>
                            Pushes records that are currently in PENDING or FAILED status without resetting previously confirmed documents.
                            Useful for draining backlog or retrying failed commits.
                        </p>
                    </div>
                    <button
                        className="fi-btn fi-btn-secondary fi-action-card-btn"
                        onClick={() => handleStart('pending')}
                        disabled={isRunning || actionLoading || !fabricStatus?.connected || (stats?.pending === 0 && stats?.failed === 0)}
                    >
                        {actionLoading && selectedMode === 'pending' ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
                        Sync Pending ({stats?.pending || 0})
                    </button>
                </div>
            </div>

            {/* Utility Row */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <span className="fi-text-secondary" style={{ fontSize: '0.85rem' }}>
                    Need fresh gRPC credentials after Fabric restart?
                </span>
                <button
                    className="fi-btn fi-btn-outline fi-btn-sm"
                    onClick={handleReconnect}
                    disabled={reconnectLoading || isRunning}
                >
                    <Network size={14} className={reconnectLoading ? 'spin' : ''} />
                    {reconnectLoading ? 'Reconnecting Gateway...' : 'Force Reconnect Gateway'}
                </button>
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <div className="fi-modal-overlay" onClick={() => setConfirmModal(false)}>
                    <div className="fi-modal-box" onClick={e => e.stopPropagation()}>
                        <div className="fi-modal-title">
                            <RefreshCw size={22} className="fi-icon-brand" />
                            Confirm Ledger Re-Commit
                        </div>
                        <div className="fi-modal-desc">
                            You are about to start a <strong>{selectedMode === 'core' ? 'Core State Re-commit' : 'Full Ledger Re-commit'}</strong>.
                            <br /><br />
                            This will:
                            <ul>
                                <li>Reset outbox tracking state for {selectedMode === 'core' ? 'all Batches, Exams, Security Events, and the latest 100 Results' : `all ${stats?.total || 0} MongoDB commitments`} to <code>PENDING</code>.</li>
                                <li>Re-submit and anchor each cryptographic hash to the newly deployed Hyperledger Fabric blockchain.</li>
                                <li>Update each document with its new Fabric Transaction ID and Block Height.</li>
                            </ul>
                        </div>
                        <div className="fi-modal-actions">
                            <button className="fi-btn fi-btn-secondary" onClick={() => setConfirmModal(false)}>
                                Cancel
                            </button>
                            <button className="fi-btn fi-btn-primary" onClick={() => handleStart(selectedMode)}>
                                Yes, Start Re-Commit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Verification Panel (single entity)
// ---------------------------------------------------------------------------
function VerificationPanel({ token, entityType, setEntityType, entityId, setEntityId }) {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const entityTypeMap = {
        result: 'result',
        batch: 'batch',
        exam: 'exam',
        event: 'event',
    };

    const handleVerify = async () => {
        if (!entityId.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const data = await apiFetch(`/${entityTypeMap[entityType]}/${entityId.trim()}`, token);
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getVerificationStatus = (result) => {
        if (!result) return null;
        if (result.reason === 'FABRIC_DISABLED') return 'FABRIC_DISABLED';
        if (result.valid === true) return 'INTEGRITY_VERIFIED';
        if (result.reason === 'HASH_MISMATCH') return 'HASH_MISMATCH';
        if (result.reason === 'COMMITMENT_NOT_FOUND') return 'COMMITMENT_NOT_FOUND';
        if (result.reason === 'ENTITY_NOT_FOUND') return 'ENTITY_NOT_FOUND';
        return 'FABRIC_ERROR';
    };

    const status = getVerificationStatus(result);

    return (
        <div className="fi-card fi-verify-card">
            <div className="fi-card-header">
                <div className="fi-card-title-row">
                    <ShieldCheck size={20} className="fi-icon-brand" />
                    <h3>Verify Entity Integrity</h3>
                </div>
            </div>
            <div className="fi-card-body">
                <p className="fi-verify-hint">
                    Enter a MongoDB ObjectId to recompute its hash and compare it against the Fabric ledger commitment.
                </p>
                <div className="fi-verify-inputs">
                    <select
                        className="fi-select"
                        value={entityType}
                        onChange={e => setEntityType(e.target.value)}
                    >
                        <option value="result">Result</option>
                        <option value="batch">Batch</option>
                        <option value="exam">Exam</option>
                        <option value="event">Security Event</option>
                    </select>
                    <input
                        className="fi-input"
                        placeholder="MongoDB ObjectId (24 hex chars)"
                        value={entityId}
                        onChange={e => setEntityId(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleVerify()}
                    />
                    <button className="fi-btn fi-btn-primary" onClick={handleVerify} disabled={loading || !entityId.trim()}>
                        {loading ? <Loader2 size={14} className="spin" /> : <Eye size={14} />}
                        Verify
                    </button>
                </div>

                {error && (
                    <div className="fi-notice fi-notice-danger">
                        <AlertTriangle size={14} /> {error}
                    </div>
                )}

                {result && (
                    <div className={`fi-verify-result fi-verify-result-${status === 'INTEGRITY_VERIFIED' ? 'success' : status === 'HASH_MISMATCH' ? 'danger' : 'warning'}`}>
                        <div className="fi-verify-result-header">
                            {status === 'INTEGRITY_VERIFIED' && <ShieldCheck size={24} className="fi-icon-success" />}
                            {status === 'HASH_MISMATCH' && <ShieldAlert size={24} className="fi-icon-danger" />}
                            {!['INTEGRITY_VERIFIED', 'HASH_MISMATCH'].includes(status) && <Shield size={24} className="fi-icon-warning" />}
                            <div>
                                <StatusBadge status={status} />
                                <div className="fi-verify-entity-id">
                                    {result.entityType} — <code>{result.entityId}</code>
                                </div>
                            </div>
                        </div>

                        <div className="fi-data-grid fi-verify-data">
                            {result.computedHash && (
                                <div className="fi-data-row">
                                    <span className="fi-data-label">
                                        <Database size={12} style={{ display: 'inline', marginRight: 4 }} />
                                        MongoDB Hash
                                    </span>
                                    <code className={`fi-data-value fi-code-hash ${status === 'HASH_MISMATCH' ? 'fi-text-danger' : ''}`}>{result.computedHash}</code>
                                </div>
                            )}
                            {result.ledgerHash && (
                                <div className="fi-data-row">
                                    <span className="fi-data-label">
                                        <Lock size={12} style={{ display: 'inline', marginRight: 4 }} />
                                        Fabric Ledger Hash
                                    </span>
                                    <code className={`fi-data-value fi-code-hash ${status === 'HASH_MISMATCH' ? 'fi-text-danger' : 'fi-text-success'}`}>{result.ledgerHash}</code>
                                </div>
                            )}
                            {result.ledgerVersion && (
                                <div className="fi-data-row">
                                    <span className="fi-data-label">Version</span>
                                    <span className="fi-data-value">v{result.ledgerVersion}</span>
                                </div>
                            )}
                            {result.blockTimestamp && (
                                <div className="fi-data-row">
                                    <span className="fi-data-label">Block Timestamp</span>
                                    <span className="fi-data-value">{new Date(result.blockTimestamp).toLocaleString()}</span>
                                </div>
                            )}
                            {result.txId && (
                                <div className="fi-data-row">
                                    <span className="fi-data-label">Tx ID</span>
                                    <code className="fi-code-sm">{result.txId?.slice(0, 16)}…</code>
                                </div>
                            )}
                            {result.outboxStatus && (
                                <div className="fi-data-row">
                                    <span className="fi-data-label">Outbox Status</span>
                                    <StatusBadge status={result.outboxStatus} />
                                </div>
                            )}
                            {result.message && (
                                <div className="fi-data-row">
                                    <span className="fi-data-label">Note</span>
                                    <span className="fi-data-value fi-text-secondary">{result.message}</span>
                                </div>
                            )}
                            <div className="fi-data-row">
                                <span className="fi-data-label">Verified At</span>
                                <span className="fi-data-value">{result.verifiedAt ? new Date(result.verifiedAt).toLocaleString() : '—'}</span>
                            </div>
                        </div>

                        {status === 'HASH_MISMATCH' && (
                            <div className="fi-notice fi-notice-danger fi-mismatch-warning">
                                <ShieldAlert size={16} />
                                <strong>⚠ INTEGRITY VIOLATION DETECTED</strong>
                                The MongoDB-computed hash does not match the committed Fabric hash.
                                This may indicate unauthorized data modification after the commitment was made.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function FabricIntegrityCenter({ token }) {
    const [fabricStatus, setFabricStatus] = useState(null);
    const [ledgerHeight, setLedgerHeight] = useState(null);
    const [recentCommitments, setRecentCommitments] = useState(null);
    const [outboxStats, setOutboxStats] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [loadingCommitments, setLoadingCommitments] = useState(false);
    const [alertCount, setAlertCount] = useState(0);

    // Hoisted verify state
    const [verifyEntityType, setVerifyEntityType] = useState('result');
    const [verifyEntityId, setVerifyEntityId] = useState('');

    const handleQuickVerify = (commitment) => {
        let mappedType = 'result';
        if (commitment.eventType === 'EXAM_COMMITMENT' || commitment.entityType === 'Exam') mappedType = 'exam';
        else if (commitment.eventType === 'BATCH_COMMITMENT' || commitment.entityType === 'Batch') mappedType = 'batch';
        else if (commitment.eventType === 'SECURITY_EVENT' || commitment.entityType === 'SecurityEvent') mappedType = 'event';

        setVerifyEntityType(mappedType);
        setVerifyEntityId(commitment.entityId);
        setActiveTab('verify');
    };

    const loadStatus = useCallback(async () => {
        setLoading(true);
        try {
            const [statusData, heightData] = await Promise.allSettled([
                apiFetch('/fabric-status', token),
                apiFetch('/ledger-height', token),
            ]);
            if (statusData.status === 'fulfilled') setFabricStatus(statusData.value);
            if (heightData.status === 'fulfilled') setLedgerHeight(heightData.value);
        } catch (err) {
            console.error('[FabricIntegrityCenter] Failed to load status:', err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const loadCommitments = useCallback(async () => {
        setLoadingCommitments(true);
        try {
            const data = await apiFetch('/recent?limit=100', token);
            setRecentCommitments(data.commitments || []);
        } catch (err) {
            setRecentCommitments([]);
        } finally {
            setLoadingCommitments(false);
        }
    }, [token]);

    const [dismissingBanner, setDismissingBanner] = useState(false);

    // Load alert count for badge
    const loadAlertCount = useCallback(async () => {
        try {
            const data = await apiFetch('/alerts', token);
            const active = data.activeIncidents !== undefined
                ? data.activeIncidents
                : (data.alerts || []).filter(a => !a.isAcknowledged).length;
            setAlertCount(active);
        } catch (_) { }
    }, [token]);

    const handleDismissBanner = async (e) => {
        if (e) e.stopPropagation();
        try {
            setDismissingBanner(true);
            await apiFetch('/alerts/dismiss', token, {
                method: 'POST',
                body: JSON.stringify({ dismissAll: true })
            });
            await loadAlertCount();
        } catch (err) {
            console.error('Failed to dismiss tamper alerts banner:', err);
        } finally {
            setDismissingBanner(false);
        }
    };

    // Load outbox stats
    const loadOutboxStats = useCallback(async () => {
        try {
            const data = await apiFetch('/outbox/stats', token);
            setOutboxStats(data);
        } catch (_) { }
    }, [token]);

    useEffect(() => {
        loadStatus();
        loadAlertCount();
        loadCommitments();
        loadOutboxStats();
        // Auto-poll network status and alerts every 15s
        const interval = setInterval(() => {
            loadStatus();
            loadAlertCount();
            loadOutboxStats();
        }, 15_000);
        return () => clearInterval(interval);
    }, [loadStatus, loadAlertCount, loadCommitments, loadOutboxStats]);

    useEffect(() => {
        if (activeTab === 'commitments') {
            loadCommitments();
        }
    }, [activeTab, loadCommitments]);

    const isOutOfSync = (ledgerHeight?.height === 0 || ledgerHeight?.height === undefined) &&
        ((outboxStats?.confirmed || 0) > 0 || (outboxStats?.total || 0) > 0);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <Activity size={14} /> },
        { id: 'visualizer', label: 'Blockchain Visualizer', icon: <Layers size={14} />, highlight: true },
        {
            id: 'recommit',
            label: 'Outbox & Re-commit',
            icon: <RefreshCw size={14} />,
            badge: isOutOfSync ? 'SYNC NEEDED' : null,
            highlight: isOutOfSync,
        },
        { id: 'verify-ledger', label: 'Verify Ledger', icon: <ScanLine size={14} /> },
        { id: 'verify', label: 'Verify Entity', icon: <ShieldCheck size={14} /> },
        { id: 'commitments', label: 'Ledger', icon: <Database size={14} /> },
        {
            id: 'alerts', label: 'Tamper Alerts', icon: <BellRing size={14} />,
            badge: alertCount > 0 ? alertCount : null,
        },
    ];

    return (
        <div className="fi-center">
            {/* Page Header */}
            <div className="fi-page-header">
                <div className="fi-page-header-left">
                    <div className="fi-page-icon">
                        <Blocks size={28} />
                    </div>
                    <div>
                        <h1 className="fi-page-title">Fabric Integrity Center</h1>
                        <p className="fi-page-subtitle">
                            Hyperledger Fabric — ZeroLeak immutable integrity ledger
                        </p>
                    </div>
                </div>
                <div className="fi-page-header-right">
                    <div className="fi-dev-badge">
                        <AlertTriangle size={12} />
                        DEV NETWORK
                    </div>
                    <StatusBadge status={
                        !fabricStatus ? 'LOADING' :
                        !fabricStatus.enabled ? 'FABRIC_DISABLED' :
                        fabricStatus.connected ? 'CONNECTED' : 'DISCONNECTED'
                    } />
                </div>
            </div>

            {/* Live Tamper Incident Alert Banner (Visible across tabs when tampering is detected) */}
            {alertCount > 0 && (
                <div
                    className="fi-critical-tamper-banner"
                    onClick={() => setActiveTab('alerts')}
                    role="button"
                    tabIndex={0}
                    title="Click to view full tampering logs"
                >
                    <div className="fi-critical-tamper-left">
                        <span className="fi-tamper-pulse" />
                        <ShieldAlert size={22} className="fi-icon-danger" />
                        <div>
                            <div className="fi-critical-tamper-title">
                                CRITICAL: {alertCount} Database Tampering Incident{alertCount !== 1 ? 's' : ''} Detected!
                            </div>
                            <div className="fi-critical-tamper-desc">
                                Unauthorized MongoDB modifications caught by Change Stream — computed document hashes violate immutable Fabric ledger commitments.
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="fi-btn fi-btn-danger fi-btn-sm"
                            onClick={() => setActiveTab('alerts')}
                        >
                            View Tamper Log →
                        </button>
                        <button
                            type="button"
                            className="fi-btn fi-btn-ghost fi-btn-sm"
                            style={{
                                background: 'rgba(239, 68, 68, 0.25)',
                                border: '1px solid rgba(239, 68, 68, 0.45)',
                                color: '#fca5a5',
                                cursor: 'pointer',
                                padding: '6px 12px',
                                borderRadius: 6,
                                fontWeight: 600,
                                fontSize: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                            }}
                            disabled={dismissingBanner}
                            onClick={handleDismissBanner}
                            title="Acknowledge and dismiss active tamper alert banner"
                        >
                            {dismissingBanner ? (
                                <>
                                    <Loader2 size={12} className="spin" /> Dismissing...
                                </>
                            ) : (
                                <>Dismiss Alert ✕</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="fi-tabs-row">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`fi-tab ${activeTab === tab.id ? 'fi-tab-active' : ''} ${tab.highlight ? 'fi-tab-highlight' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.badge && <span className="fi-tab-badge">{tab.badge}</span>}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="fi-tab-content">

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="fi-overview">

                        {/* Out of Sync Callout Banner on Overview */}
                        {isOutOfSync && (
                            <div
                                className="fi-sync-overview-callout"
                                onClick={() => setActiveTab('recommit')}
                                role="button"
                                tabIndex={0}
                                title="Click to go to Outbox Re-commit"
                            >
                                <div className="fi-sync-overview-callout-left">
                                    <RefreshCw size={22} className="fi-icon-warning" />
                                    <div>
                                        <strong>Blockchain Reset Detected (Ledger Height: 0)</strong>
                                        <p>
                                            Hyperledger Fabric was recreated with an empty ledger. MongoDB contains {outboxStats?.total || 1363} commitments that need to be re-anchored.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    className="fi-btn fi-btn-warning fi-btn-sm"
                                    onClick={(e) => { e.stopPropagation(); setActiveTab('recommit'); }}
                                >
                                    Re-commit to Blockchain →
                                </button>
                            </div>
                        )}

                        <LedgerStatsRow
                            height={ledgerHeight}
                            commitments={recentCommitments}
                            tamperCount={alertCount}
                        />
                        <NetworkStatusCard
                            status={fabricStatus}
                            onRefresh={loadStatus}
                            loading={loading}
                        />


                        {/* Architecture */}
                        <div className="fi-card fi-info-card">
                            <div className="fi-card-header">
                                <div className="fi-card-title-row">
                                    <Info size={18} className="fi-icon-brand" />
                                    <h3>Architecture</h3>
                                </div>
                            </div>
                            <div className="fi-card-body fi-arch-body">
                                <div className="fi-arch-flow">
                                    {[
                                        { icon: <Database size={16} />, label: 'MongoDB', desc: 'Application state (source of truth)' },
                                        { icon: <Hash size={16} />, label: 'SHA-256', desc: 'Deterministic canonical hash' },
                                        { icon: <Box size={16} />, label: 'IntegrityOutbox', desc: 'Reliable async delivery' },
                                        { icon: <Network size={16} />, label: 'Fabric Gateway', desc: 'gRPC + TLS connection' },
                                        { icon: <Layers size={16} />, label: 'Fabric Ledger', desc: 'Immutable commitment store' },
                                    ].map((step, i, arr) => (
                                        <React.Fragment key={i}>
                                            <div className="fi-arch-step">
                                                <div className="fi-arch-step-icon">{step.icon}</div>
                                                <div className="fi-arch-step-label">{step.label}</div>
                                                <div className="fi-arch-step-desc">{step.desc}</div>
                                            </div>
                                            {i < arr.length - 1 && <ChevronRight size={14} className="fi-arch-arrow" />}
                                        </React.Fragment>
                                    ))}
                                </div>

                                <div className="fi-arch-notes">
                                    <div className="fi-arch-note">
                                        <span className="fi-arch-note-title">MongoDB</span> — stores all application data (results, exams, questions, users).
                                    </div>
                                    <div className="fi-arch-note">
                                        <span className="fi-arch-note-title">Fabric</span> — stores only SHA-256 integrity commitments. No passwords, answers, or sensitive payloads.
                                    </div>
                                    <div className="fi-arch-note">
                                        <span className="fi-arch-note-title">Verification</span> — recomputes the hash from MongoDB and compares it against the Fabric commitment. If they differ, an integrity violation is detected.
                                    </div>
                                    <div className="fi-arch-note">
                                        <span className="fi-arch-note-title">Auto-Detection</span> — MongoDB Change Streams watch for unauthorized direct DB writes in real time, triggering instant tamper alerts.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Blockchain Visualizer Tab */}
                {activeTab === 'visualizer' && (
                    <FabricBlockchainVisualizer
                        token={token}
                        onVerifyEntity={handleQuickVerify}
                    />
                )}

                {/* Outbox & Re-commit Tab */}
                {activeTab === 'recommit' && (
                    <OutboxRecommitPanel
                        token={token}
                        fabricStatus={fabricStatus}
                        ledgerHeight={ledgerHeight}
                        onRefreshStatus={() => {
                            loadStatus();
                            loadCommitments();
                            loadOutboxStats();
                        }}
                        onNavigateTab={(tab) => setActiveTab(tab)}
                    />
                )}

                {/* Verify Ledger Tab */}
                {activeTab === 'verify-ledger' && (
                    <VerifyLedgerPanel token={token} />
                )}

                {/* Verify Entity Tab */}
                {activeTab === 'verify' && (
                    <VerificationPanel
                        token={token}
                        entityType={verifyEntityType}
                        setEntityType={setVerifyEntityType}
                        entityId={verifyEntityId}
                        setEntityId={setVerifyEntityId}
                    />
                )}

                {/* Commitments Tab */}
                {activeTab === 'commitments' && (
                    <div className="fi-card">
                        <div className="fi-card-header">
                            <div className="fi-card-title-row">
                                <Database size={20} className="fi-icon-brand" />
                                <h3>Recent Ledger Commitments</h3>
                                <button className="fi-refresh-btn" onClick={loadCommitments} disabled={loadingCommitments}>
                                    <RefreshCw size={14} className={loadingCommitments ? 'spin' : ''} />
                                </button>
                            </div>
                            {ledgerHeight && (
                                <div className="fi-ledger-height-badge">
                                    Ledger height: <strong>{ledgerHeight.height}</strong>
                                </div>
                            )}
                        </div>
                        <div className="fi-card-body">
                            <RecentCommitmentsTable
                                commitments={recentCommitments}
                                loading={loadingCommitments}
                                onVerify={handleQuickVerify}
                            />
                        </div>
                    </div>
                )}

                {/* Tamper Alerts Tab */}
                {activeTab === 'alerts' && (
                    <div className="fi-card">
                        <div className="fi-card-header">
                            <div className="fi-card-title-row">
                                <BellRing size={20} className="fi-icon-danger" />
                                <h3>Tamper Detection Alerts</h3>
                            </div>
                        </div>
                        <div className="fi-card-body">
                            <p className="fi-verify-hint">
                                These alerts are automatically generated by the MongoDB Change Stream watcher
                                when it detects an unauthorized direct database modification whose hash no longer
                                matches the Fabric ledger commitment. Alerts auto-refresh every 30 seconds.
                            </p>
                            <TamperAlertsPanel token={token} onAlertsUpdated={loadAlertCount} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
