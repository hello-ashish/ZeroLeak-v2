import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Plus, AlertCircle, PackageOpen, Edit2, Eye, EyeOff } from 'lucide-react'
import { StatusBadge } from '../../components/StatusBadge.jsx'
import { Skeleton } from '../../components/SkeletonLoader.jsx'
import { Modal } from '../../components/Modal.jsx'
import { useToast } from '../../components/Toast.jsx'

const ProfessorBatchesPage = () => {
    const [batches, setBatches] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()
    const toast = useToast()

    const [expandedBatches, setExpandedBatches] = useState({})

    const toggleBatchExpansion = (batchId) => {
        setExpandedBatches(prev => ({ ...prev, [batchId]: !prev[batchId] }))
    }

    const fetchMyBatches = async (token) => {
        try {
            const response = await axios.get('/api/professor/batches', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setBatches(response.data.batches || [])
        } catch (error) {
            console.error("Error fetching batches: ", error)
            setBatches([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const token = localStorage.getItem('profToken')
        if (!token) {
            navigate('/professor/login')
        } else {
            fetchMyBatches(token)
        }
    }, [navigate])



    return (
        <>

            <div className="page-header" style={{ marginBottom: 32 }}>
                <div className="page-header-top">
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                            Manage Content
                        </p>
                        <h1 className="page-title" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
                            Question Batches
                        </h1>
                        <p className="page-subtitle" style={{ fontSize: 14 }}>
                            Manage your question pools and submit them for review.
                        </p>
                    </div>

                </div>
            </div>

            <div style={{ display: 'grid', gap: 24 }}>
                {useMemo(() => {
                    return [...batches].sort((a, b) => {
                        if (a.status === 'MarkForReview' && b.status !== 'MarkForReview') return -1;
                        if (a.status !== 'MarkForReview' && b.status === 'MarkForReview') return 1;
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    });
                }, [batches]).map((batch) => (
                    <div className="card" key={batch._id}>
                        <div className="card-body" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: 'var(--text-primary)' }}>{batch.title}</h3>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>Subject: {batch.subject} • {batch.questions?.length || 0} Questions</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {batch.status === 'MarkForReview' && (
                                        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/professor/batches/${batch._id}/edit`)}>
                                            <Edit2 size={14} style={{ marginRight: 6 }} /> Edit & Resubmit
                                        </button>
                                    )}
                                    {batch.questions && batch.questions.length > 0 && (batch.status === 'Draft' || batch.status === 'MarkForReview') && (
                                        <button className="btn btn-ghost btn-sm" onClick={() => toggleBatchExpansion(batch._id)}>
                                            {expandedBatches[batch._id] ? <><EyeOff size={14} style={{ marginRight: 6 }} /> Hide Questions</> : <><Eye size={14} style={{ marginRight: 6 }} /> View Questions</>}
                                        </button>
                                    )}
                                    <StatusBadge status={['Accepted', 'Rejected'].includes(batch.status) ? 'Submitted' : batch.status} />
                                </div>
                            </div>

                            {batch.adminMessage && batch.status === 'MarkForReview' && (
                                <div style={{ background: 'var(--danger-subtle)', borderLeft: '3px solid var(--danger)', padding: 12, marginBottom: 16, borderRadius: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
                                        <AlertCircle size={14} /> Admin Feedback
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>{batch.adminMessage}</p>
                                </div>
                            )}

                            {expandedBatches[batch._id] && batch.questions && batch.questions.length > 0 && (batch.status === 'Draft' || batch.status === 'MarkForReview') && (
                                <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                                    {batch.questions.map((q, idx) => (
                                        <div key={q._id} style={{ padding: 16, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-surface)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                                                    {idx + 1}. {q.title}
                                                </div>

                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                {q.options && q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} style={{ padding: '4px 8px', background: oIdx === q.correctAnswerIndex ? 'var(--success-subtle)' : 'var(--bg-base)', color: oIdx === q.correctAnswerIndex ? 'var(--success)' : 'var(--text-secondary)', borderRadius: 4, border: oIdx === q.correctAnswerIndex ? '1px solid var(--success)' : '1px solid var(--border-default)' }}>
                                                        {String.fromCharCode(65 + oIdx)}. {opt}
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', gap: 16 }}>
                                                <span>Topic: {q.topic}</span>
                                                <span style={{ textTransform: 'capitalize' }}>Difficulty: {q.difficultyLevel}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {(batch.status === 'Draft' || batch.status === 'MarkForReview') && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 24, borderTop: '1px solid var(--border-default)', paddingTop: 16, justifyContent: 'flex-end' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/professor/batches/${batch._id}/edit`)}>
                                        <Edit2 size={14} style={{ marginRight: 4 }} /> Edit Batch
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading ? (
                    <>
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="card" style={{ padding: '24px' }}>
                                <Skeleton height={20} width="40%" style={{ marginBottom: 8 }} />
                                <Skeleton height={14} width="25%" style={{ marginBottom: 24 }} />
                                <div style={{ display: 'flex', gap: 8, marginTop: 24, borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
                                    <Skeleton height={32} width="120px" />
                                    <Skeleton height={32} width="140px" />
                                </div>
                            </div>
                        ))}
                    </>
                ) : batches.length === 0 ? (
                    <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                        <PackageOpen size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px', opacity: 0.5 }} />
                        <h3 style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 4 }}>No Batches Found</h3>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 24 }}>You haven't created any question pools yet.</p>

                    </div>
                ) : null}
            </div>
        </>
    )
}

export default ProfessorBatchesPage
