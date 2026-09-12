import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { AdminLayout } from './AdminLayout.jsx'
import { Modal } from '../../components/Modal.jsx'
import { SkeletonTable, EmptyState } from '../../components/SkeletonLoader.jsx'
import { useToast } from '../../components/Toast.jsx'
import { Key, UserPlus, UserMinus, CheckCircle2, XCircle, AlertTriangle, PlayCircle, Trash2, Edit3, MapPin, RefreshCw, ScrollText, Download, ShieldCheck } from 'lucide-react'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('adminToken')

const getActionDetails = (action) => {
    const map = {
        ADMIN_LOGIN: { icon: <Key size={14} />, label: 'Admin Authentication', color: 'var(--info)' },
        PROFESSOR_CREATED: { icon: <UserPlus size={14} />, label: 'Professor Registered', color: 'var(--success)' },
        PROFESSOR_DELETED: { icon: <UserMinus size={14} />, label: 'Professor Removed', color: 'var(--danger)' },
        STUDENT_DELETED: { icon: <UserMinus size={14} />, label: 'Student Removed', color: 'var(--danger)' },
        BATCH_APPROVED: { icon: <CheckCircle2 size={14} />, label: 'Batch Approved', color: 'var(--success)' },
        BATCH_REJECTED: { icon: <XCircle size={14} />, label: 'Batch Rejected', color: 'var(--danger)' },
        BATCH_MARKED_FOR_REVIEW: { icon: <AlertTriangle size={14} />, label: 'Batch Marked for Review', color: 'var(--warning)' },
        EXAM_LIVE: { icon: <PlayCircle size={14} />, label: 'Exam Published', color: 'var(--success)' },
        EXAM_COMPLETED: { icon: <CheckCircle2 size={14} />, label: 'Exam Concluded', color: 'var(--info)' },
        EXAM_DELETED: { icon: <Trash2 size={14} />, label: 'Exam Deleted', color: 'var(--danger)' },
        ADMIN_PROFILE_UPDATED: { icon: <Edit3 size={14} />, label: 'Admin Profile Updated', color: 'var(--brand-primary)' },
    }
    return map[action] || { icon: <MapPin size={14} />, label: action, color: 'var(--text-tertiary)' }
}

export default function AdminActivityPage() {
    const [logs, setLogs] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [previewModal, setPreviewModal] = useState({ isOpen: false, title: '', content: '', headers: [], rows: [], filename: '' })
    const LIMIT = 20
    const navigate = useNavigate()
    const toast = useToast()

    const fetchLogs = async (p = 1) => {
        const token = getToken()
        if (!token) { navigate('/admin/login'); return }
        try {
            setLoading(true)
            const res = await axios.get(`${API}/admin/audit-logs?page=${p}&limit=${LIMIT}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setLogs(res.data.logs || [])
            setTotal(res.data.total || 0)
            setPage(p)
        } catch {
            toast.error('Failed to load activity log')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchLogs() }, [])

    const totalPages = Math.ceil(total / LIMIT)

    const handleExport = () => {
        if (!logs.length) {
            toast.info('No logs to export')
            return
        }
        const headers = ['Timestamp', 'Event Type', 'Actor', 'Target Object', 'Details'];
        const rows = logs.map(l => {
            const date = new Date(l.createdAt).toLocaleString()
            const action = getActionDetails(l.action).label
            const actor = l.actor?.email || 'System'
            const target = l.targetModel ? `${l.targetModel} (${l.targetId})` : '—'
            const details = l.details ? JSON.stringify(l.details) : '—'
            return [date, action, actor, target, details]
        });
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        ].join('\n')
        
        setPreviewModal({
            isOpen: true,
            title: 'Audit Logs Export Preview',
            content: csvContent,
            headers: headers,
            rows: rows,
            filename: `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
        });
    }

    const handleDownload = (content, filename) => {
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + content)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", filename)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Logs exported successfully')
        setPreviewModal({ ...previewModal, isOpen: false });
    }

    return (
        <AdminLayout>
            <div className="page-header">
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">System Audit Log</h1>
                        <p className="page-subtitle">Immutable record of administrative actions and platform events</p>
                    </div>
                    <div className="page-actions">
                        <button className="btn btn-secondary flex items-center gap-2" onClick={() => fetchLogs(page)}>
                            <RefreshCw size={14} /> Refresh
                        </button>
                        <button className="btn btn-secondary flex items-center gap-2" onClick={handleExport}>
                            <Download size={14} /> Export Logs
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24, padding: '16px 20px', background: 'var(--success-subtle)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)' }}>
                <ShieldCheck size={20} color="var(--success)" style={{ flexShrink: 0 }} />
                <div>
                    <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>Audit Logging Active</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>All critical administrative actions are being securely logged with cryptographic timestamps.</p>
                </div>
            </div>

            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Event Type</th>
                            <th>Actor</th>
                            <th>Target Object</th>
                            <th>Details</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    {loading ? (
                        <SkeletonTable rows={10} />
                    ) : (
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <EmptyState
                                            icon={<ScrollText size={32} color="var(--text-tertiary)" />}
                                            title="No activity recorded"
                                            description="Admin actions will be tracked and displayed here."
                                        />
                                    </td>
                                </tr>
                            ) : logs.map((log) => {
                                const { icon, label, color } = getActionDetails(log.action)
                                return (
                                    <tr key={log._id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                                                    background: `${color}18`,
                                                    color: color,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    {icon}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{label}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{log._id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{log.actor}</span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{log.targetLabel || '—'}</span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{log.details || '—'}</span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                                {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    )}
                </table>
                
                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                            Page {page} of {totalPages} · {total} events
                        </span>
                        <div className="pagination">
                            <button className="pagination-btn" onClick={() => fetchLogs(page - 1)} disabled={page <= 1}>←</button>
                            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                                const p = i + 1
                                return (
                                    <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => fetchLogs(p)}>{p}</button>
                                )
                            })}
                            <button className="pagination-btn" onClick={() => fetchLogs(page + 1)} disabled={page >= totalPages}>→</button>
                        </div>
                    </div>
                )}
            </div>
            <Modal open={previewModal.isOpen} onClose={() => setPreviewModal({ ...previewModal, isOpen: false })} title={previewModal.title} size="full">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{
                        background: 'var(--bg-body)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        maxHeight: '400px',
                        overflow: 'auto',
                    }}>
                        <table className="table" style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    {previewModal.headers?.map((h, i) => (
                                        <th key={i} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', background: 'var(--bg-surface)' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewModal.rows?.length > 0 ? previewModal.rows.map((row, i) => (
                                    <tr key={i}>
                                        {row.map((cell, j) => (
                                            <td key={j} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>{cell}</td>
                                        ))}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={previewModal.headers?.length || 1} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No data</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex gap-3" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                        <button className="btn btn-ghost" onClick={() => setPreviewModal({ ...previewModal, isOpen: false })}>Cancel</button>
                        <button className="btn btn-primary flex items-center gap-2" onClick={() => handleDownload(previewModal.content, previewModal.filename)}>
                            <Download size={16} /> Download CSV
                        </button>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    )
}
