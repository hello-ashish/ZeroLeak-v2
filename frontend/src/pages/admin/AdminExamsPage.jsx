import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { AdminLayout } from './AdminLayout.jsx'
import { StatusBadge } from '../../components/StatusBadge.jsx'
import { ConfirmDialog } from '../../components/Modal.jsx'
import { SkeletonTable, EmptyState } from '../../components/SkeletonLoader.jsx'
import { useToast } from '../../components/Toast.jsx'
import { Search, ClipboardList, Play, Square, Trash2, Plus, Clock, Users, ArrowRight } from 'lucide-react'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('adminToken')

const TABS = ['All', 'Draft', 'Scheduled', 'Live', 'Completed', 'Archived']

export default function AdminExamsPage() {
    const [exams, setExams] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('All')
    const [search, setSearch] = useState('')
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [selectedExam, setSelectedExam] = useState(null)
    const toast = useToast()
    const navigate = useNavigate()

    const fetchData = async () => {
        const token = getToken()
        if (!token) { navigate('/admin/login'); return }
        try {
            setLoading(true)
            const res = await axios.get(`${API}/exams`, { headers: { Authorization: `Bearer ${token}` } })
            setExams(res.data.exams || [])
        } catch {
            toast.error('Failed to load exams')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    const filtered = useMemo(() => {
        return exams
            .filter(e => activeTab === 'All' ? true : (e.status || 'Draft') === activeTab)
            .filter(e => e.title?.toLowerCase().includes(search.toLowerCase()))
    }, [exams, activeTab, search])

    const tabCounts = useMemo(() => {
        const c = {}
        TABS.forEach(t => {
            c[t] = t === 'All' ? exams.length : exams.filter(e => (e.status || 'Draft') === t).length
        })
        return c
    }, [exams])

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await axios.delete(`${API}/admin/exams/${deleteTarget._id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            })
            toast.success('Exam deleted')
            if (selectedExam?._id === deleteTarget._id) setSelectedExam(null)
            setDeleteTarget(null)
            fetchData()
        } catch {
            toast.error('Failed to delete exam')
        } finally {
            setDeleting(false)
        }
    }

    const handleStatusChange = async (exam, newStatus) => {
        try {
            await axios.patch(`${API}/admin/exams/${exam._id}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            })
            toast.success(`Exam ${newStatus.toLowerCase()}`)
            fetchData()
            if (selectedExam?._id === exam._id) setSelectedExam({ ...selectedExam, status: newStatus })
        } catch {
            toast.error('Failed to update exam status')
        }
    }

    return (
        <AdminLayout>
            <div className="page-header">
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Exam Workspace</h1>
                        <p className="page-subtitle">Manage examination lifecycles and analyze outcomes</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/admin/exams/create')}>
                        <Plus size={16} /> New Exam
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                {/* Main List Area */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Tabs */}
                    <div className="flex gap-3 mb-4 flex-wrap" style={{ alignItems: 'center', borderBottom: '1px solid var(--border-default)' }}>
                        <div className="tabs" style={{ marginBottom: -1 }}>
                            {TABS.map(t => (
                                <button 
                                    key={t} 
                                    className={`tab-item ${activeTab === t ? 'active' : ''}`} 
                                    onClick={() => { setActiveTab(t); setSelectedExam(null); }}
                                >
                                    {t}
                                    <span className="tab-count">{tabCounts[t]}</span>
                                </button>
                            ))}
                        </div>
                        <div style={{ marginLeft: 'auto', marginBottom: 12 }}>
                            <div className="search-input-wrap" style={{ width: 260 }}>
                                <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
                                <input className="search-input" placeholder="Search exams..." value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Exam Title</th>
                                    <th>Questions</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            {loading ? (
                                <SkeletonTable rows={5} />
                            ) : (
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={5}>
                                            <EmptyState
                                                icon={<ClipboardList size={32} color="var(--text-tertiary)" />}
                                                title={`No ${activeTab.toLowerCase()} exams`}
                                                description={search ? 'No exams match that search.' : `You don't have any exams in ${activeTab} status.`}
                                                action={!search && <button className="btn btn-primary" onClick={() => navigate('/admin/exams/create')}><Plus size={16} /> New Exam</button>}
                                            />
                                        </td></tr>
                                    ) : filtered.map(exam => {
                                        const isSelected = selectedExam?._id === exam._id
                                        return (
                                            <tr key={exam._id} 
                                                onClick={() => setSelectedExam(exam)}
                                                style={{ 
                                                    cursor: 'pointer', 
                                                    background: isSelected ? 'var(--bg-active)' : 'transparent',
                                                    borderLeft: isSelected ? '2px solid var(--brand-primary)' : '2px solid transparent'
                                                }}
                                            >
                                                <td>
                                                    <div>
                                                        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{exam.title}</p>
                                                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }} className="truncate" title={exam.description}>
                                                            {exam.description?.slice(0, 50)}{exam.description?.length > 50 ? '...' : ''}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{exam.questions?.length || 0}</td>
                                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{exam.durationMinutes}m</td>
                                                <td><StatusBadge status={exam.status || 'Draft'} /></td>
                                                <td onClick={e => e.stopPropagation()}>
                                                    <div className="flex gap-1">
                                                        {(exam.status === 'Draft' || !exam.status) && (
                                                            <button className="btn btn-sm btn-success" onClick={() => handleStatusChange(exam, 'Live')} title="Publish">
                                                                <Play size={14} />
                                                            </button>
                                                        )}
                                                        {exam.status === 'Live' && (
                                                            <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange(exam, 'Completed')} title="Complete">
                                                                <Square size={14} />
                                                            </button>
                                                        )}
                                                        {exam.status === 'Completed' && (
                                                            <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange(exam, 'Archived')} title="Archive">
                                                                Archive
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            )}
                        </table>
                    </div>
                </div>

                {/* Insights Side Panel */}
                {selectedExam && (
                    <div style={{ 
                        width: 320, 
                        flexShrink: 0, 
                        background: 'var(--bg-elevated)', 
                        border: '1px solid var(--border-default)', 
                        borderRadius: 'var(--radius-lg)', 
                        position: 'sticky', 
                        top: 'var(--topbar-height)',
                        marginTop: 48,
                        animation: 'slideInRight 200ms ease'
                    }}>
                        <div style={{ padding: 20, borderBottom: '1px solid var(--border-default)' }}>
                            <StatusBadge status={selectedExam.status || 'Draft'} />
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 12 }}>{selectedExam.title}</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                Created {new Date(selectedExam.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div style={{ padding: 20 }}>
                            <div className="flex gap-2 mb-4">
                                <div style={{ flex: 1, background: 'var(--bg-surface)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                                    <Clock size={16} color="var(--text-tertiary)" className="mb-2" />
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Duration</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedExam.durationMinutes}m</div>
                                </div>
                                <div style={{ flex: 1, background: 'var(--bg-surface)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                                    <ClipboardList size={16} color="var(--text-tertiary)" className="mb-2" />
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Questions</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedExam.questions?.length || 0}</div>
                                </div>
                            </div>
                            
                            {/* Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ width: '100%', justifyContent: 'space-between' }}
                                    onClick={() => navigate(`/admin/exams/${selectedExam._id}`)}
                                >
                                    Open Exam Workspace <ArrowRight size={16} />
                                </button>
                                <button 
                                    className="btn btn-danger" 
                                    style={{ width: '100%' }}
                                    onClick={() => setDeleteTarget(selectedExam)}
                                >
                                    <Trash2 size={16} /> Delete Exam
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirm */}
            <ConfirmDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Delete Exam"
                message={`Are you sure you want to permanently delete "${deleteTarget?.title}"? This cannot be undone.`}
                confirmLabel="Delete Exam"
                danger
                loading={deleting}
            />
        </AdminLayout>
    )
}
