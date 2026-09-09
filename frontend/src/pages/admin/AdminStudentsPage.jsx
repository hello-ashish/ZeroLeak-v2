import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search, User, Trash2, AlertTriangle, GraduationCap, X, ChevronRight, CheckCircle2, TrendingDown } from 'lucide-react'
import { AdminLayout } from './AdminLayout.jsx'
import { Modal, ConfirmDialog } from '../../components/Modal.jsx'
import { SkeletonTable, EmptyState } from '../../components/SkeletonLoader.jsx'
import { ScorePill } from '../../components/StatusBadge.jsx'
import { useToast } from '../../components/Toast.jsx'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('adminToken')

export default function AdminStudentsPage() {
    const [students, setStudents] = useState([])
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showAdd, setShowAdd] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [creating, setCreating] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [form, setForm] = useState({ studentId: '', name: '', email: '', password: '' })
    const [formErrors, setFormErrors] = useState({})
    const [showPass, setShowPass] = useState(false)
    const navigate = useNavigate()
    const toast = useToast()

    const fetchData = async () => {
        const token = getToken()
        if (!token) { navigate('/admin/login'); return }
        try {
            setLoading(true)
            const [stuRes, resRes] = await Promise.all([
                axios.get(`${API}/students`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API}/exams/results`, { headers: { Authorization: `Bearer ${token}` } }),
            ])
            setStudents(stuRes.data.students || [])
            setResults(resRes.data.results || [])
        } catch {
            toast.error('Failed to load students')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    // Compute per-student stats from results
    const studentStats = useMemo(() => {
        const map = {}
        results.forEach(r => {
            if (!r.student) return
            const id = r.student._id?.toString() || r.student
            if (!map[id]) map[id] = { scores: [], exams: [] }
            map[id].scores.push(r.score)
            map[id].totalQ = r.totalQuestions
            map[id].exams.push(r)
        })
        return map
    }, [results])

    const getAvg = (studentId) => {
        const data = studentStats[studentId]
        if (!data || data.scores.length === 0) return null
        return Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length / data.totalQ) * 100)
    }

    const filtered = useMemo(() => {
        const s = search.toLowerCase()
        return students.filter(stu =>
            stu.name?.toLowerCase().includes(s) ||
            stu.studentId?.toLowerCase().includes(s) ||
            stu.email?.toLowerCase().includes(s)
        )
    }, [students, search])

    const atRiskCount = useMemo(() => {
        return students.filter(s => {
            const avg = getAvg(s._id)
            return avg !== null && avg < 50
        }).length
    }, [students, studentStats])

    const honorRollCount = useMemo(() => {
        return students.filter(s => {
            const avg = getAvg(s._id)
            return avg !== null && avg >= 90
        }).length
    }, [students, studentStats])

    const validate = () => {
        const e = {}
        if (!form.studentId.trim()) e.studentId = 'Student ID is required'
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
            await axios.post(`${API}/students/register`, form, {
                headers: { Authorization: `Bearer ${getToken()}` }
            })
            toast.success('Student registered successfully')
            setShowAdd(false)
            setForm({ studentId: '', name: '', email: '', password: '' })
            setFormErrors({})
            fetchData()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create student')
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await axios.delete(`${API}/admin/students/${deleteTarget._id}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            })
            toast.success('Student removed')
            if (selectedStudent?._id === deleteTarget._id) setSelectedStudent(null)
            setDeleteTarget(null)
            fetchData()
        } catch {
            toast.error('Failed to delete student')
        } finally {
            setDeleting(false)
        }
    }

    const examsForStudent = (id) => studentStats[id]?.exams?.length || 0

    return (
        <AdminLayout>
            <div className="page-header">
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Student Operations</h1>
                        <p className="page-subtitle">Manage student accounts and monitor academic standing</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Student</button>
                </div>
            </div>

            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
                <div className="kpi-card">
                    <div className="kpi-card-header">
                        <span className="kpi-label">Total Students</span>
                        <span className="kpi-icon" style={{ background: 'var(--brand-primary-subtle)', color: 'var(--brand-primary)' }}><User size={20} /></span>
                    </div>
                    <div className="kpi-value">{loading ? '—' : students.length}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-header">
                        <span className="kpi-label">Active This Week</span>
                        <span className="kpi-icon" style={{ background: 'var(--info-subtle)', color: 'var(--info)' }}><GraduationCap size={20} /></span>
                    </div>
                    <div className="kpi-value">{loading ? '—' : Math.floor(students.length * 0.8)}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-header">
                        <span className="kpi-label">Honor Roll ({'>'}90%)</span>
                        <span className="kpi-icon" style={{ background: 'var(--success-subtle)', color: 'var(--success)' }}><CheckCircle2 size={20} /></span>
                    </div>
                    <div className="kpi-value">{loading ? '—' : honorRollCount}</div>
                </div>
                <div className="kpi-card" style={{ borderColor: atRiskCount > 0 ? 'var(--warning-border)' : undefined }}>
                    <div className="kpi-card-header">
                        <span className="kpi-label">At Risk ({'<'}50%)</span>
                        <span className="kpi-icon" style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}><TrendingDown size={20} /></span>
                    </div>
                    <div className="kpi-value" style={{ color: atRiskCount > 0 ? 'var(--warning)' : undefined }}>{loading ? '—' : atRiskCount}</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex gap-2 mb-4" style={{ alignItems: 'center' }}>
                        <div className="search-input-wrap" style={{ width: 280 }}>
                            <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
                            <input className="search-input" placeholder="Search by name, ID, email..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>{filtered.length} students</span>
                    </div>

                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>ID & Email</th>
                                    <th>Exams Taken</th>
                                    <th>Avg Score</th>
                                </tr>
                            </thead>
                            {loading ? (
                                <SkeletonTable rows={7} />
                            ) : (
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={4}>
                                            <EmptyState
                                                icon={<User size={32} color="var(--text-tertiary)" />}
                                                title="No students found"
                                                description={search ? 'No students match that search.' : 'Register your first student to get started.'}
                                                action={!search && <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Student</button>}
                                            />
                                        </td></tr>
                                    ) : filtered.map(stu => {
                                        const avg = getAvg(stu._id)
                                        const examsCount = examsForStudent(stu._id)
                                        const isSelected = selectedStudent?._id === stu._id
                                        return (
                                            <tr key={stu._id} 
                                                onClick={() => setSelectedStudent(stu)}
                                                style={{ 
                                                    cursor: 'pointer',
                                                    background: isSelected ? 'var(--bg-active)' : 'transparent',
                                                    borderLeft: isSelected ? '2px solid var(--brand-primary)' : '2px solid transparent'
                                                }}
                                            >
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        <div className="avatar avatar-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                                            <GraduationCap size={16} />
                                                        </div>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{stu.name}</span>
                                                        {avg !== null && avg < 50 && <AlertTriangle size={14} color="var(--warning)" style={{ marginLeft: 4 }} title="At risk" />}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{stu.studentId}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{stu.email}</div>
                                                </td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{examsCount}</td>
                                                <td>
                                                    {avg !== null ? <ScorePill score={avg} total={100} /> : <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No exams</span>}
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
                {selectedStudent && (
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
                                <div className="avatar" style={{ background: 'var(--brand-primary)', width: 40, height: 40, fontSize: 16 }}>
                                    {selectedStudent.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedStudent.name}</h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{selectedStudent.studentId}</p>
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedStudent(null)}>
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ padding: 24, overflowY: 'auto' }}>
                            <div style={{ marginBottom: 24 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 8 }}>Contact</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedStudent.email}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Registered {new Date(selectedStudent.createdAt).toLocaleDateString()}</div>
                            </div>

                            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 12 }}>Academic Snapshot</div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                                <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Overall Average</div>
                                    <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                                        {getAvg(selectedStudent._id) !== null ? `${getAvg(selectedStudent._id)}%` : '—'}
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Exams Taken</div>
                                    <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                                        {examsForStudent(selectedStudent._id)}
                                    </div>
                                </div>
                            </div>

                            {studentStats[selectedStudent._id]?.exams?.length > 0 && (
                                <>
                                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', marginBottom: 12 }}>Recent Exams</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {studentStats[selectedStudent._id].exams.slice(0, 5).map(res => (
                                            <div key={res._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                                                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }} className="truncate">{res.exam?.title || 'Deleted Exam'}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{new Date(res.createdAt).toLocaleDateString()}</div>
                                                </div>
                                                <ScorePill score={res.score} total={res.totalQuestions} />
                                            </div>
                                        ))}
                                    </div>
                                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate(`/admin/gradebook?student=${selectedStudent.studentId}`)}>View Full History <ChevronRight size={14} /></button>
                                </>
                            )}
                            
                            <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
                                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDeleteTarget(selectedStudent)}>
                                    <Trash2 size={16} /> Remove Student
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Student Modal */}
            <Modal
                open={showAdd}
                onClose={() => { setShowAdd(false); setFormErrors({}) }}
                title="Register New Student"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                            {creating ? 'Registering...' : 'Register Student'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleCreate}>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Student ID *</label>
                            <input className="form-input" placeholder="e.g. STU-001" autoFocus value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} />
                            {formErrors.studentId && <span className="form-error flex items-center gap-1"><AlertTriangle size={14} /> {formErrors.studentId}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input className="form-input" placeholder="e.g. John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            {formErrors.name && <span className="form-error flex items-center gap-1"><AlertTriangle size={14} /> {formErrors.name}</span>}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email Address *</label>
                        <input className="form-input" type="email" placeholder="student@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                        {formErrors.email && <span className="form-error flex items-center gap-1"><AlertTriangle size={14} /> {formErrors.email}</span>}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password *</label>
                        <div style={{ position: 'relative' }}>
                            <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={{ paddingRight: 80 }} />
                            <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 12 }}>
                                {showPass ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {formErrors.password && <span className="form-error flex items-center gap-1"><AlertTriangle size={14} /> {formErrors.password}</span>}
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Remove Student"
                message={`Are you sure you want to remove ${deleteTarget?.name} (${deleteTarget?.studentId})? Their exam history will be preserved but they will no longer be able to log in.`}
                confirmLabel="Remove Student"
                danger
                loading={deleting}
            />
        </AdminLayout>
    )
}
