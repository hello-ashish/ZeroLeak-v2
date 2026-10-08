// =============================================================================
// ZeroLeak — FabricIntegrityCenter.jsx
// =============================================================================
// Real Fabric Integrity Center — shows actual Fabric network status,
// live ledger height, recent commitments, and entity verification.
//
// Distinct states shown:
//   CONNECTED / DISCONNECTED / FABRIC_DISABLED
//   COMMITMENT_CONFIRMED / COMMITMENT_PENDING / COMMITMENT_FAILED
//   INTEGRITY_VERIFIED / HASH_MISMATCH / COMMITMENT_NOT_FOUND
//
// NO mock/simulated data is mixed with real Fabric state.
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield, ShieldCheck, ShieldAlert, ShieldOff,
    Activity, Database, Hash, Clock, RefreshCw,
    CheckCircle, XCircle, AlertTriangle, Loader2,
    ChevronRight, Eye, Network, Layers, Box,
    AlertCircle, Info
} from 'lucide-react';
import './FabricIntegrityCenter.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
async function apiFetch(path, token) {
    const res = await fetch(`${API_BASE}/api/integrity${path}`, {
        headers: { Authorization: `Bearer ${token}` },
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
                <StatusBadge status={isConnected ? 'CONNECTED' : isEnabled ? 'DISCONNECTED' : 'FABRIC_DISABLED'} />
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
                {!isEnabled && (
                    <div className="fi-notice fi-notice-info">
                        <Info size={14} />
                        Fabric integration is disabled. Set <code>FABRIC_ENABLED=true</code> and start the network to enable integrity commitments.
                    </div>
                )}
                {isEnabled && !isConnected && status?.error && (
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
function LedgerStatsRow({ height, commitments }) {
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
                    <div className="fi-stat-label">Recent Commitments</div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Recent Commitments Table
// ---------------------------------------------------------------------------
function RecentCommitmentsTable({ commitments, loading, onVerify }) {
    if (loading) return (
        <div className="fi-loading-row">
            <Loader2 size={16} className="spin" /> Loading commitments...
        </div>
    );
    if (!commitments || commitments.length === 0) return (
        <div className="fi-empty">
            <Database size={32} className="fi-icon-muted" />
            <p>No commitments on ledger yet.</p>
        </div>
    );

    return (
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
                    {commitments.map((c, i) => (
                        <tr key={i} className="fi-table-row">
                            <td><code className="fi-code-sm">{c.id?.slice(0, 24)}…</code></td>
                            <td>
                                <span className={`fi-type-badge fi-type-${c.eventType?.toLowerCase().replace('_', '-')}`}>
                                    {c.eventType?.replace('_COMMITMENT', '') || '—'}
                                </span>
                            </td>
                            <td><code className="fi-code-sm">{c.entityId?.slice(0, 8)}…</code></td>
                            <td><HashDisplay hash={c.dataHash} /></td>
                            <td className="fi-timestamp">{c.blockTimestamp ? new Date(c.blockTimestamp).toLocaleString() : '—'}</td>
                            <td className="fi-center">v{c.version}</td>
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
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Verification Panel
// ---------------------------------------------------------------------------
function VerificationPanel({ token, entityType, setEntityType, entityId, setEntityId }) {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const entityTypeMap = {
        result: 'result',
        question: 'question',
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
                    <h3>Integrity Verification</h3>
                </div>
            </div>
            <div className="fi-card-body">
                <div className="fi-verify-inputs">
                    <select
                        className="fi-select"
                        value={entityType}
                        onChange={e => setEntityType(e.target.value)}
                    >
                        <option value="result">Result</option>
                        <option value="question">Question</option>
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
                                    <span className="fi-data-label">MongoDB Hash</span>
                                    <HashDisplay hash={result.computedHash} />
                                </div>
                            )}
                            {result.ledgerHash && (
                                <div className="fi-data-row">
                                    <span className="fi-data-label">Fabric Hash</span>
                                    <HashDisplay hash={result.ledgerHash} />
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
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [loadingCommitments, setLoadingCommitments] = useState(false);

    // Hoisted verify state
    const [verifyEntityType, setVerifyEntityType] = useState('result');
    const [verifyEntityId, setVerifyEntityId] = useState('');

    const handleQuickVerify = (commitment) => {
        let mappedType = 'result';
        if (commitment.eventType === 'QUESTION_COMMITMENT') mappedType = 'question';
        else if (commitment.eventType === 'EXAM_COMMITMENT') mappedType = 'exam';
        else if (commitment.eventType === 'SECURITY_EVENT_COMMITMENT') mappedType = 'event';

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
            const data = await apiFetch('/recent?limit=20', token);
            setRecentCommitments(data.commitments || []);
        } catch (err) {
            setRecentCommitments([]);
        } finally {
            setLoadingCommitments(false);
        }
    }, [token]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    useEffect(() => {
        if (activeTab === 'commitments') {
            loadCommitments();
        }
    }, [activeTab, loadCommitments]);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <Activity size={14} /> },
        { id: 'verify', label: 'Verify Integrity', icon: <ShieldCheck size={14} /> },
        { id: 'commitments', label: 'Ledger', icon: <Database size={14} /> },
    ];

    return (
        <div className="fi-center">
            {/* Page Header */}
            <div className="fi-page-header">
                <div className="fi-page-header-left">
                    <div className="fi-page-icon">
                        <Shield size={28} />
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
                        !fabricStatus?.enabled ? 'FABRIC_DISABLED' :
                        fabricStatus?.connected ? 'CONNECTED' : 'DISCONNECTED'
                    } />
                </div>
            </div>

            {/* Tabs */}
            <div className="fi-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`fi-tab ${activeTab === tab.id ? 'fi-tab-active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="fi-tab-content">

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="fi-overview">
                        <NetworkStatusCard
                            status={fabricStatus}
                            onRefresh={loadStatus}
                            loading={loading}
                        />

                        <LedgerStatsRow height={ledgerHeight} commitments={recentCommitments} />

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
                                        { icon: <Database size={16}/>, label: 'MongoDB', desc: 'Application state (source of truth)' },
                                        { icon: <Hash size={16}/>, label: 'SHA-256', desc: 'Deterministic canonical hash' },
                                        { icon: <Box size={16}/>, label: 'IntegrityOutbox', desc: 'Reliable async delivery' },
                                        { icon: <Network size={16}/>, label: 'Fabric Gateway', desc: 'gRPC + TLS connection' },
                                        { icon: <Layers size={16}/>, label: 'Fabric Ledger', desc: 'Immutable commitment store' },
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
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Verify Tab */}
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
            </div>
        </div>
    );
}
