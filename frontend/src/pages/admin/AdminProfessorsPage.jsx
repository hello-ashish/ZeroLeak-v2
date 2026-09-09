import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { AdminLayout } from './AdminLayout.jsx'
import { Modal, ConfirmDialog } from '../../components/Modal.jsx'
import { SkeletonTable, EmptyState } from '../../components/SkeletonLoader.jsx'
import { useToast } from '../../components/Toast.jsx'
import { Search, Users, Trash2, AlertTriangle, BookOpen, Clock, Activity, X, Mail } from 'lucide-react'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('adminToken')

export default function AdminProfessorsPage() {
    const [professors, setProfessors] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [creating, setCreating] = useState(false)
    const [selectedProf, setSelectedProf] = useState(null)
    const [form, setForm] = useState({ id: '', name: '', email: '', contact: '', address: '', password: '' })
    const [formErrors, setFormErrors] = useState({})
    const [showPass, setShowPass] = useState(false)
    const navigate = useNavigate()
    const toast = useToast()

    const fetchProfessors = async () => {
        const token = getToken()
        if (!token) { navigate('/admin/login'); return }
        try {
            setLoading(true)
            const res = await axios.get(`${API}/admin/professors`, { headers: { Authorization: `Bearer ${token}` } })
            setProfessors(res.data.professors || [])
        } catch {
            toast.error('Failed to load professors')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchProfessors() }, [])

    const filtered = useMemo(() => {
        const s = search.toLowerCase()
        return professors.filter(p =>
            p.name?.toLowerCase().includes(s) ||
            p.id?.toLowerCase().includes(s) ||
            p.email?.toLowerCase().includes(s)
        )
    }, [professors, search])

    const validate = () => {
        const e = {}
        if (!form.id.trim()) e.id = 'Professor ID is required'
        if (!form.name.trim()) e.name = 'Name is required'
        if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email is required'
        if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters'
        return e
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) { setFormErrors(errs); return }
        setCreating(true)
        try {
            await axios.post(`${API}/admin/professors`, form, {
                headers: { Authorization: `Bearer ${getToken()}` }
            })
            toast.success('Professor created successfully')
            setShowAdd(false)
            setForm({ id: '', name: '', email: '', contact: '', address: '', password: '' })
            setFormErrors({})
            fetchProfessors()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create professor')
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await axios.delete(`${API}/admin/professors/${deleteTarget.id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            })
            toast.success('Professor removed')
            if (selectedProf?._id === deleteTarget._id) setSelectedProf(null)
            setDeleteTarget(null)
            fetchProfessors()
        } catch {
            toast.error('Failed to delete professor')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <AdminLayout>
            <div className="page-header">
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Faculty Overview</h1>
                        <p className="page-subtitle">Manage institutional professors and content contributors</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Professor</button>
                </div>
            </div>

            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
                <div className="kpi-card">
                    <div className="kpi-card-header">
                        <span className="kpi-label">Total Faculty</span>
                        <span className="kpi-icon" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--brand-secondary)' }}><Users size={20} /></span>
                    </div>
                    <div className="kpi-value">{loading ? '—' : professors.length}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-header">
                        <span className="kpi-label">Active Content Creators</span>
                        <span className="kpi-icon" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}><BookOpen size={20} /></span>
                    </div>
                    <div className="kpi-value">{loading ? '—' : Math.floor(professors.length * 0.6)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-header">
                        <span className="kpi-label">Pending Reviews</span>
                        <span className="kpi-icon" style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}><Clock size={20} /></span>
                    </div>
                    <div className="kpi-value">{loading ? '—' : 2}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-header">
                        <span className="kpi-label">Platform Activity</span>
                        <span className="kpi-icon" style={{ background: 'var(--info-subtle)', color: 'var(--info)' }}><Activity size={20} /></span>
                    </div>
                    <div className="kpi-value">Normal</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex gap-2 mb-4" style={{ alignItems: 'center' }}>
                        <div className="search-input-wrap" style={{ width: 280 }}>
                            <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
                            <input className="search-input" placeholder="Search by name, ID, email..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>{filtered.length} faculty members</span>
                    </div>

                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Professor</th>
                                    <th>ID</th>
                                    <th>Email</th>
                                    <th>Contact</th>
                                    <th>Added</th>
                                </tr>
                            </thead>
                            {loading ? (
                                <SkeletonTable rows={5} />
                            ) : (
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={5}>
                                            <EmptyState
                                                icon={<Users size={32} color="var(--text-tertiary)" />}
                                                title="No professors found"
                                                description={search ? 'No professors match that search.' : 'Add your first faculty member to get started.'}
                                                action={!search && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Professor</button>}
                                            />
                                        </td></tr>
                                    ) : filtered.map(prof => {
                                        const isSelected = selectedProf?._id === prof._id
                                        return (
                                            <tr key={prof._id} 
                                                onClick={() => setSelectedProf(prof)}
                                                style={{ 
                                                    cursor: 'pointer',
                                                    background: isSelected ? 'var(--bg-active)' : 'transparent',
                                                    borderLeft: isSelected ? '2px solid var(--brand-secondary)' : '2px solid transparent'
                                                }}
                                            >
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <span className="avatar avatar-sm" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--brand-secondary)' }}>
                                                            {prof.name?.charAt(0)?.toUpperCase()}
                                                        </span>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prof.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{prof.id}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{prof.email}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{prof.contact || '—'}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                                    {new Date(prof.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            )}
                        </table>
                    </div>
                </div>

                {/* Right Side Drawer / Panel */}
                {selectedProf && (
                    <div style={{ 
                        width: 380, 
                        flexShrink: 0, 
                        background: 'var(--bg-elevated)', 
                        border: '1px solid var(--border-default)', 
                        borderRadius: 'var(--radius-lg)', 
                        position: 'sticky', 
                        top: 'var(--topbar-height)',
                        marginTop: 48,
                        animation: 'slideInRight 200ms ease',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: 'calc(100vh - 120px)'
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div className="flex items-center gap-3">
                                <div className="avatar" style={{ background: 'var(--brand-secondary)', width: 40, height: 40, fontSize: 16 }}>
                                    {selectedProf.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedProf.name}</h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{selectedProf.id}</p>
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedProf(null)}>
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ padding: 24, overflowY: 'auto' }}>
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Contact & Profile</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                    <Mail size={14} /> {selectedProf.email}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Joined {new Date(selectedProf.createdAt).toLocaleDateString()}</div>
                            </div>

                            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 12 }}>Contributions Snapshot</div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                                <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Batches Submitted</div>
                                    <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                                        {selectedProf.batchesSubmitted || 0}
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Questions Approved</div>
                                    <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                                        {selectedProf.questionsApproved || 0}
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
                                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDeleteTarget(selectedProf)}>
                                    <Trash2 size={16} /> Remove Professor
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Professor Modal */}
            <Modal
                open={showAdd}
                onClose={() => { setShowAdd(false); setFormErrors({}) }}
                title="Create New Professor"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                            {creating ? 'Creating...' : 'Create Professor'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleCreate}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Professor ID *</label>
                            <input className="form-input" placeholder="e.g. PROF-001" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} />
                            {formErrors.id && <span className="form-error flex items-center gap-1"><AlertTriangle size={14} /> {formErrors.id}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input className="form-input" placeholder="e.g. Dr. Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            {formErrors.name && <span className="form-error flex items-center gap-1"><AlertTriangle size={14} /> {formErrors.name}</span>}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email Address *</label>
                        <input className="form-input" type="email" placeholder="professor@institution.edu" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                        {formErrors.email && <span className="form-error flex items-center gap-1"><AlertTriangle size={14} /> {formErrors.email}</span>}
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Contact (optional)</label>
                            <input className="form-input" placeholder="+91 98765 43210" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password *</label>
                            <div style={{ position: 'relative' }}>
                                <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={{ paddingRight: 60 }} />
                                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 12 }}>
                                    {showPass ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            {formErrors.password && <span className="form-error flex items-center gap-1"><AlertTriangle size={14} /> {formErrors.password}</span>}
                        </div>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Remove Professor"
                message={`Are you sure you want to remove Professor ${deleteTarget?.name} (${deleteTarget?.id})? Their submitted question batches will remain in the system.`}
                confirmLabel="Remove Professor"
                danger
                loading={deleting}
            />
        </AdminLayout>
    )
}
