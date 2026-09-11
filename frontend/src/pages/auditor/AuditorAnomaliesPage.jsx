import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuditorLayout } from './AuditorLayout.jsx'
import { SkeletonRow } from '../../components/SkeletonLoader.jsx'
import axios from 'axios'
import { format } from 'date-fns'
import { ShieldAlert, RefreshCw, CheckCircle2 } from 'lucide-react'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('auditorToken')

export default function AuditorAnomaliesPage() {
    const [anomalies, setAnomalies] = useState([])
    const [loading, setLoading] = useState(true)
    const [scanning, setScanning] = useState(false)
    const navigate = useNavigate()

    const fetchAnomalies = async () => {
        const token = getToken()
        if (!token) { navigate('/auditor/login'); return }
        setLoading(true)
        try {
            const res = await axios.get(`${API}/auditor/anomalies`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setAnomalies(res.data.anomalies)
        } catch (err) {
            if (err.response?.status === 401) navigate('/auditor/login')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchAnomalies() }, [])

    const handleScan = async () => {
        const token = getToken()
        setScanning(true)
        try {
            await axios.post(`${API}/auditor/anomalies/scan`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
            await fetchAnomalies()
        } catch (err) {
            console.error(err)
        } finally {
            setScanning(false)
        }
    }

    const updateStatus = async (id, status) => {
        const token = getToken()
        try {
            await axios.patch(`${API}/auditor/anomalies/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setAnomalies(prev => prev.map(a => a._id === id ? { ...a, status } : a))
        } catch (err) {
            console.error(err)
        }
    }

    const openCount = anomalies.filter(a => a.status === 'Open').length

    const severityColors = {
        'Critical': { bg: 'var(--danger-subtle)', color: 'var(--danger)' },
        'High': { bg: 'var(--warning-subtle)', color: 'var(--warning)' },
        'Medium': { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' },
        'Low': { bg: 'var(--bg-hover)', color: 'var(--text-secondary)' },
        'Informational': { bg: 'var(--info-subtle)', color: 'var(--info)' }
    }

    return (
        <AuditorLayout openAnomaliesCount={openCount}>
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                        Integrity & Security
                    </p>
                    <h1 className="page-title">Anomaly Center</h1>
                    <p className="page-subtitle">Detected patterns that may require investigation. Only explainable, rule-based findings.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary" onClick={handleScan} disabled={scanning}>
                        <RefreshCw size={16} style={{ animation: scanning ? 'spin 1s linear infinite' : 'none' }} />
                        {scanning ? 'Scanning...' : 'Run Detection Scan'}
                    </button>
                </div>
            </div>

            {/* Summary Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Open', count: anomalies.filter(a => a.status === 'Open').length, color: 'var(--danger)' },
                    { label: 'Under Review', count: anomalies.filter(a => a.status === 'Under Review').length, color: 'var(--warning)' },
                    { label: 'Resolved', count: anomalies.filter(a => a.status === 'Resolved').length, color: 'var(--success)' }
                ].map(item => (
                    <div key={item.label} className="card" style={{ padding: '16px 20px' }}>
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{item.label}</p>
                        <p style={{ fontSize: 28, fontWeight: 700, color: item.count > 0 ? item.color : 'var(--text-primary)' }}>{item.count}</p>
                    </div>
                ))}
            </div>

            <div className="card">
                <div className="data-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Detected</th>
                                <th>Rule Triggered</th>
                                <th>Severity</th>
                                <th>Category</th>
                                <th>Actor</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        {loading ? (
                            <tbody>
                                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                            </tbody>
                        ) : (
                            <tbody>
                                {anomalies.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '48px' }}>
                                            <CheckCircle2 size={32} color="var(--success)" style={{ opacity: 0.5, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                                            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Anomalies Detected</p>
                                            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Run a detection scan to check for new patterns.</p>
                                        </td>
                                    </tr>
                                ) : anomalies.map(anom => {
                                    const sev = severityColors[anom.severity] || severityColors['Low']
                                    return (
                                        <tr key={anom._id}>
                                            <td style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                                                {format(new Date(anom.createdAt), 'MMM d, HH:mm')}
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{anom.rule}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{anom.description}</div>
                                            </td>
                                            <td>
                                                <span className="badge" style={{ background: sev.bg, color: sev.color }}>
                                                    {anom.severity}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{anom.category}</td>
                                            <td style={{ fontSize: 13 }}>{anom.actor || '-'}</td>
                                            <td>
                                                <select
                                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: 12, color: 'var(--text-primary)', cursor: 'pointer' }}
                                                    value={anom.status}
                                                    onChange={(e) => updateStatus(anom._id, e.target.value)}
                                                >
                                                    <option value="Open">Open</option>
                                                    <option value="Under Review">Under Review</option>
                                                    <option value="Resolved">Resolved</option>
                                                    <option value="Dismissed">Dismissed</option>
                                                </select>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        )}
                    </table>
                </div>
            </div>
        </AuditorLayout>
    )
}
