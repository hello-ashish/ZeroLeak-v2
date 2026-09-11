import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { AuditorLayout } from './AuditorLayout.jsx'
import { SkeletonCard } from '../../components/SkeletonLoader.jsx'
import { AlertTriangle, Activity, CheckCircle2, ShieldAlert, FileText, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('auditorToken')

export default function AuditorDashboardPage() {
    const [metrics, setMetrics] = useState(null)
    const [recentLogs, setRecentLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchDashboard = async () => {
            const token = getToken()
            if (!token) {
                navigate('/auditor/login')
                return
            }
            try {
                const res = await axios.get(`${API}/auditor/metrics`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setMetrics(res.data.metrics)
                setRecentLogs(res.data.recentLogs)
                setLoading(false)
            } catch (err) {
                console.error(err)
                if (err.response?.status === 401) {
                    navigate('/auditor/login')
                } else {
                    setError('Failed to load auditor analytics.')
                    setLoading(false)
                }
            }
        }
        fetchDashboard()
    }, [])

    return (
        <AuditorLayout openAnomaliesCount={metrics?.openAnomalies || 0}>
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom: 32 }}>
                <div className="page-header-top">
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                            System Assurance
                        </p>
                        <h1 className="page-title" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
                            Auditor Overview
                        </h1>
                        <p className="page-subtitle" style={{ fontSize: 14 }}>
                            Monitor activity, review evidence, and investigate anomalies.
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="kpi-showcase">
                    {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : (
                <>
                    {/* Audit Health Summary Strip */}
                    <div className="status-strip" style={{ marginBottom: 24 }}>
                        <div className="status-strip-item" style={{ flex: 1 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 0 3px var(--success-subtle)' }} />
                            <span><strong>Audit Logging Operational</strong> — Events are being recorded successfully.</span>
                        </div>
                        {recentLogs.length > 0 && (
                            <div className="status-strip-item" style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>
                                Last event: {format(new Date(recentLogs[0].createdAt), 'MMM d, h:mm:ss a')}
                            </div>
                        )}
                    </div>

                    {/* High-Level Metrics */}
                    <div className="kpi-showcase" style={{ marginBottom: 32 }}>
                        <div className="kpi-module">
                            <p className="kpi-module-title">Audit Events</p>
                            <p className="kpi-module-value">{metrics?.totalEvents?.toLocaleString() || 0}</p>
                            <p className="kpi-module-sub" style={{ color: 'var(--text-secondary)' }}>
                                <FileText size={16} /> <span>Historical records</span>
                            </p>
                        </div>
                        <div className="kpi-module">
                            <p className="kpi-module-title">High-Risk Events</p>
                            <p className="kpi-module-value" style={{ color: metrics?.highRiskEvents > 0 ? 'var(--warning)' : 'inherit' }}>
                                {metrics?.highRiskEvents || 0}
                            </p>
                            <p className="kpi-module-sub" style={{ color: 'var(--text-secondary)' }}>
                                <AlertTriangle size={16} /> <span>Require attention</span>
                            </p>
                        </div>
                        <div className="kpi-module">
                            <p className="kpi-module-title">Unresolved Anomalies</p>
                            <p className="kpi-module-value" style={{ color: metrics?.openAnomalies > 0 ? 'var(--danger)' : 'inherit' }}>
                                {metrics?.openAnomalies || 0}
                            </p>
                            <p className="kpi-module-sub" style={{ color: 'var(--text-secondary)' }}>
                                <ShieldAlert size={16} /> <span>Open cases</span>
                            </p>
                        </div>
                        <div className="kpi-module">
                            <p className="kpi-module-title">Logging Status</p>
                            <p className="kpi-module-value" style={{ fontSize: 24, color: 'var(--success)' }}>
                                {metrics?.loggingStatus || 'Healthy'}
                            </p>
                            <p className="kpi-module-sub" style={{ color: 'var(--success)' }}>
                                <CheckCircle2 size={16} /> <span>Verified</span>
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        {/* Recent Audit Events */}
                        <div className="card">
                            <div className="card-header" style={{ padding: '20px 24px' }}>
                                <h3 className="card-title">Recent Audit Events</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auditor/audit')}>Open Explorer</button>
                            </div>
                            <div className="data-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Event</th>
                                            <th>Actor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentLogs.length > 0 ? (
                                            recentLogs.slice(0, 8).map(log => (
                                                <tr key={log._id}>
                                                    <td style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
                                                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                                                    </td>
                                                    <td>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                                        {log.actor}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '32px' }}>
                                                <p style={{ color: 'var(--text-tertiary)' }}>No recent events.</p>
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Attention Center / Anomalies */}
                        <div className="card">
                            <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ShieldAlert size={18} color="var(--danger)" />
                                    <h3 className="card-title">Attention Required</h3>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/auditor/anomalies')}>View Cases</button>
                            </div>
                            <div style={{ padding: '24px' }}>
                                {metrics?.openAnomalies > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div style={{ padding: '16px', background: 'var(--danger-subtle)', borderRadius: 8, border: '1px solid var(--danger-subtle)' }}>
                                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)' }}>Action Needed</p>
                                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>There are unresolved anomalies requiring your review.</p>
                                            <button className="btn btn-sm btn-secondary" style={{ marginTop: 12 }} onClick={() => navigate('/auditor/anomalies')}>
                                                Investigate
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                                        <CheckCircle2 size={32} color="var(--success)" style={{ opacity: 0.5, marginBottom: 12 }} />
                                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No Active Anomalies</p>
                                        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                            No unresolved anomalies were detected.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </AuditorLayout>
    )
}
