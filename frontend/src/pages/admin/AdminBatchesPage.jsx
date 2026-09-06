import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { AdminLayout } from './AdminLayout.jsx'
import { StatusBadge, DifficultyBadge } from '../../components/StatusBadge.jsx'
import { SkeletonCard, EmptyState } from '../../components/SkeletonLoader.jsx'
import { useToast } from '../../components/Toast.jsx'
import { AlertTriangle, PackageOpen, Check, X, Eye, Clock, MessageSquare, ChevronRight } from 'lucide-react'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('adminToken')

const TABS = ['Pending', 'Accepted', 'Rejected', 'All']

export default function AdminBatchesPage() {
    const [batches, setBatches] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('Pending')
    const [activeBatch, setActiveBatch] = useState(null)
    const [pendingCount, setPendingCount] = useState(0)
    const [reviewing, setReviewing] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [markReason, setMarkReason] = useState('')
    const [actionState, setActionState] = useState(null) // 'reject' or 'mark'
    
    const navigate = useNavigate()
    const toast = useToast()

    const fetchBatches = async () => {
        const token = getToken()
        if (!token) { navigate('/admin/login'); return }
        try {
            setLoading(true)
            const res = await axios.get(`${API}/admin/batches`, { headers: { Authorization: `Bearer ${token}` } })
            const all = res.data.batches || []
            setBatches(all)
            setPendingCount(all.filter(b => b.status === 'Submitted').length)
            
            // Auto-select first pending batch if none selected
            if (!activeBatch && all.filter(b => b.status === 'Submitted').length > 0) {
                openBatch(all.filter(b => b.status === 'Submitted')[0])
            }
        } catch {
            toast.error('Failed to load batches')
        } finally {
            setLoading(false)
        }
    }

    const openBatch = async (batch) => {
        const token = getToken()
        try {
            const res = await axios.get(`${API}/admin/batches/${batch._id}`, { headers: { Authorization: `Bearer ${token}` } })
            setActiveBatch(res.data.batch)
            setActionState(null)
            setRejectReason('')
            setMarkReason('')
        } catch {
            toast.error('Failed to open batch')
        }
    }

    useEffect(() => { fetchBatches() }, [])

    const filtered = useMemo(() => {
        if (activeTab === 'All') return batches
        if (activeTab === 'Pending') return batches.filter(b => b.status === 'Submitted')
        if (activeTab === 'Accepted') return batches.filter(b => b.status === 'Accepted')
        if (activeTab === 'Rejected') return batches.filter(b => b.status === 'Rejected')
        return batches
    }, [batches, activeTab])

    const tabCounts = useMemo(() => ({
        Pending: batches.filter(b => b.status === 'Submitted').length,
        Accepted: batches.filter(b => b.status === 'Accepted').length,
        Rejected: batches.filter(b => b.status === 'Rejected').length,
        All: batches.length,
    }), [batches])

    const doReview = async (action, adminMessage = '') => {
        setReviewing(true)
        try {
            await axios.post(`${API}/admin/batches/${activeBatch._id}/review`, { action, adminMessage }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            })
            const labels = { Accept: 'approved', Reject: 'rejected', MarkForReview: 'marked for review' }
            toast.success(`Batch ${labels[action]} successfully`)
            setActiveBatch(null)
            setActionState(null)
            fetchBatches()
        } catch {
            toast.error('Failed to process batch')
        } finally {
            setReviewing(false)
        }
    }

    return (
        <AdminLayout pendingBatchCount={pendingCount}>
            <div className="page-header" style={{ marginBottom: 16 }}>
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Batch Review Queue</h1>
                        <p className="page-subtitle">Evaluate submitted question batches for the question bank</p>
                    </div>
                    {pendingCount > 0 && (
                        <div className="alert-box alert-box-warning" style={{ padding: '10px 16px', margin: 0 }}>
                            <AlertTriangle size={16} />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{pendingCount} batch{pendingCount !== 1 ? 'es' : ''} awaiting review</span>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 180px)' }}>
                {/* Left Side: Queue List */}
                <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)' }}>
                        <div className="tabs" style={{ marginBottom: 0, width: '100%' }}>
                            {TABS.slice(0, 3).map(t => (
                                <button key={t} className={`tab-item ${activeTab === t ? 'active' : ''}`} style={{ flex: 1, padding: '8px 4px', fontSize: 12 }} onClick={() => { setActiveTab(t); setActiveBatch(null); }}>
                                    {t} <span className="tab-count">{tabCounts[t]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                            </div>
                        ) : filtered.length === 0 ? (
                            <EmptyState
                                icon={<PackageOpen size={32} color="var(--text-tertiary)" />}
                                title="Queue is empty"
                                description={`No ${activeTab.toLowerCase()} batches.`}
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {filtered.map(batch => {
                                    const isSelected = activeBatch?._id === batch._id
                                    return (
                                        <div 
                                            key={batch._id}
                                            onClick={() => openBatch(batch)}
                                            style={{ 
                                                padding: 16, 
                                                background: isSelected ? 'var(--bg-active)' : 'var(--bg-surface)', 
                                                border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', flex: 1 }} className="truncate">
                                                    {batch.title}
                                                </p>
                                                <ChevronRight size={16} color={isSelected ? 'var(--brand-primary)' : 'var(--text-tertiary)'} />
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                                by {batch.createdBy?.name || 'Unknown'}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                <StatusBadge status={batch.status === 'Submitted' ? 'Scheduled' : batch.status === 'Accepted' ? 'Live' : batch.status === 'Rejected' ? 'Rejected' : batch.status} />
                                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{batch.questions?.length || 0} Qs</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Review Interface */}
                <div style={{ flex: 1, minWidth: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {activeBatch ? (
                        <>
                            {/* Header */}
                            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                                        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{activeBatch.title}</h2>
                                        <StatusBadge status={activeBatch.status === 'Submitted' ? 'Scheduled' : activeBatch.status === 'Accepted' ? 'Live' : activeBatch.status === 'Rejected' ? 'Rejected' : activeBatch.status} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
                                        <span><strong style={{ color: 'var(--text-primary)' }}>Professor:</strong> {activeBatch.createdBy?.name || 'Unknown'}</span>
                                        <span><strong style={{ color: 'var(--text-primary)' }}>Subject:</strong> {activeBatch.subject}</span>
                                        <span><strong style={{ color: 'var(--text-primary)' }}>Submitted:</strong> {new Date(activeBatch.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                {activeBatch.status === 'Submitted' && !actionState && (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-secondary" onClick={() => setActionState('mark')}>Mark for Review</button>
                                        <button className="btn btn-danger" onClick={() => setActionState('reject')}>Reject</button>
                                        <button className="btn btn-success" onClick={() => doReview('Accept')} disabled={reviewing}>
                                            <Check size={16} /> Approve
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Action Form Overlays */}
                            {actionState === 'reject' && (
                                <div style={{ padding: '16px 32px', background: 'var(--danger-subtle)', borderBottom: '1px solid var(--danger-border)' }}>
                                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>Reject Batch</h4>
                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Provide a reason for rejection. This will be sent to the professor.</p>
                                    <textarea className="form-textarea" style={{ marginBottom: 12, background: 'var(--bg-surface)' }} placeholder="e.g. Questions are too ambiguous, please revise..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-sm btn-danger" onClick={() => doReview('Reject', rejectReason)} disabled={reviewing || !rejectReason.trim()}>Confirm Rejection</button>
                                        <button className="btn btn-sm btn-ghost" onClick={() => setActionState(null)}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            {actionState === 'mark' && (
                                <div style={{ padding: '16px 32px', background: 'var(--warning-subtle)', borderBottom: '1px solid var(--warning-border)' }}>
                                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--warning)', marginBottom: 8 }}>Mark for Review</h4>
                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Provide feedback for the professor to revise before resubmitting.</p>
                                    <textarea className="form-textarea" style={{ marginBottom: 12, background: 'var(--bg-surface)' }} placeholder="e.g. Please check formatting on Q3..." value={markReason} onChange={e => setMarkReason(e.target.value)} />
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-sm" style={{ background: 'var(--warning)', color: '#fff', border: 'none' }} onClick={() => doReview('MarkForReview', markReason)} disabled={reviewing}>Send Feedback</button>
                                        <button className="btn btn-sm btn-ghost" onClick={() => setActionState(null)}>Cancel</button>
                                    </div>
                                </div>
                            )}

                            {/* Question List */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: 32, background: 'var(--bg-surface)' }}>
                                {activeBatch.adminMessage && (
                                    <div style={{ background: 'var(--info-subtle)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 24, display: 'flex', gap: 12 }}>
                                        <MessageSquare size={20} color="var(--info)" style={{ flexShrink: 0 }} />
                                        <div>
                                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--info)' }}>Feedback Provided</p>
                                            <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>{activeBatch.adminMessage}</p>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Questions ({activeBatch.questions?.length})</h3>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    {activeBatch.questions?.map((q, i) => (
                                        <div key={i} style={{ padding: 20, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                                            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                                                    {i + 1}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                                        <DifficultyBadge level={q.difficultyLevel} />
                                                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{q.topic || 'No topic'}</span>
                                                    </div>
                                                    <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 16 }}>{q.title}</p>
                                                    
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                                        {q.options?.map((opt, j) => {
                                                            const isCorrect = opt === q.correctAnswer
                                                            return (
                                                                <div key={j} style={{
                                                                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                                                                    background: isCorrect ? 'var(--success-subtle)' : 'var(--bg-surface)',
                                                                    border: `1px solid ${isCorrect ? 'var(--success-border)' : 'var(--border-subtle)'}`,
                                                                    display: 'flex', gap: 10, alignItems: 'center', fontSize: 13
                                                                }}>
                                                                    <div style={{ 
                                                                        width: 20, height: 20, borderRadius: '50%', 
                                                                        background: isCorrect ? 'var(--success)' : 'var(--bg-elevated)', 
                                                                        color: isCorrect ? '#fff' : 'var(--text-tertiary)', 
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 
                                                                    }}>
                                                                        {String.fromCharCode(65 + j)}
                                                                    </div>
                                                                    <span style={{ color: isCorrect ? 'var(--success)' : 'var(--text-primary)', fontWeight: isCorrect ? 600 : 400 }}>{opt}</span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-tertiary)' }}>
                            <Eye size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                            <p style={{ fontSize: 16, fontWeight: 500 }}>Select a batch to review</p>
                            <p style={{ fontSize: 13, marginTop: 4 }}>Review questions and approve them for the library</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
