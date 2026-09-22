import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from './AdminLayout.jsx'
import { ArrowLeft, Check, BookOpen, Settings, Search, Database, Trash2, Plus } from 'lucide-react'
import { useToast } from '../../components/Toast.jsx'
import axios from 'axios'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('adminToken')

export const AdminExamBuilderPage = () => {
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({ title: '', description: '' })
    const [subjects, setSubjects] = useState([])
    const [allQuestions, setAllQuestions] = useState([])
    const [currentSubj, setCurrentSubj] = useState({ subject: '', numQuestions: 10, durationMinutes: 60, passingPercentage: 50 })
    const [creating, setCreating] = useState(false)
    const navigate = useNavigate()
    const toast = useToast()

    React.useEffect(() => {
        axios.get(`${API}/questions`, { headers: { Authorization: `Bearer ${getToken()}` } })
            .then(res => setAllQuestions(res.data.questions || []))
            .catch(console.error)
    }, [])

    const handleAddSubject = () => {
        if (!currentSubj.subject) return toast.error('Please select or enter a subject')
        if (subjects.some(s => s.subject.toLowerCase() === currentSubj.subject.toLowerCase())) {
            return toast.error('Subject already added')
        }
        setSubjects([...subjects, { ...currentSubj }])
        setCurrentSubj({ subject: '', numQuestions: 10, durationMinutes: 60, passingPercentage: 50 })
    }

    const removeSubject = (idx) => {
        setSubjects(subjects.filter((_, i) => i !== idx))
    }

    const handleCreate = async () => {
        setCreating(true)
        try {
            await axios.post(`${API}/admin/examinations`, {
                title: form.title,
                description: form.description,
                subjects: subjects
            }, { headers: { Authorization: `Bearer ${getToken()}` } })

            toast.success('Examination created successfully!')
            navigate('/admin/exams')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create examination')
        } finally {
            setCreating(false)
        }
    }

    return (
        <AdminLayout>
            <div className="page-header" style={{ marginBottom: 32 }}>
                <button className="btn btn-ghost btn-sm" style={{ padding: 0, marginBottom: 16 }} onClick={() => navigate('/admin/exams')}>
                    <ArrowLeft size={16} /> Back to Exams
                </button>
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title" style={{ fontSize: 24 }}>Examination Builder</h1>
                        <p className="page-subtitle">Configure a new multi-subject examination (e.g. JEE Mains)</p>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
                    {[
                        { num: 1, label: 'Details', icon: <BookOpen size={16} /> },
                        { num: 2, label: 'Subjects', icon: <Database size={16} /> },
                        { num: 3, label: 'Review', icon: <Check size={16} /> }
                    ].map(s => (
                        <div key={s.num} style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: step >= s.num ? 'var(--brand-primary-subtle)' : 'var(--bg-elevated)',
                            border: `1px solid ${step >= s.num ? 'var(--brand-primary-border)' : 'var(--border-default)'}`,
                            color: step >= s.num ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontWeight: 600, fontSize: 13
                        }}>
                            {s.icon} {s.num}. {s.label}
                        </div>
                    ))}
                </div>

                <div className="card" style={{ padding: 32 }}>
                    {step === 1 && (
                        <div>
                            <h2 style={{ fontSize: 18, marginBottom: 24 }}>Examination Details</h2>
                            <div className="form-group mb-4">
                                <label className="form-label">Examination Title *</label>
                                <input className="form-input" placeholder="e.g. JEE Mains 2026" autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description *</label>
                                <textarea className="form-textarea" style={{ minHeight: 120 }} placeholder="General instructions for the examination..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h2 style={{ fontSize: 18, marginBottom: 24 }}>Configure Subjects</h2>

                            {/* Subject List */}
                            {subjects.length > 0 && (
                                <div style={{ marginBottom: 24, display: 'grid', gap: 12 }}>
                                    {subjects.map((s, idx) => (
                                        <div key={idx} style={{ padding: 16, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.subject}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.numQuestions} Qs • {s.durationMinutes} mins • {s.passingPercentage}% Pass</div>
                                            </div>
                                            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => removeSubject(idx)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Subject Form */}
                            <div style={{ background: 'var(--bg-elevated)', padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Add Subject</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label className="form-label">Subject Name</label>
                                        <select 
                                            className="form-select" 
                                            value={currentSubj.subject} 
                                            onChange={e => setCurrentSubj({ ...currentSubj, subject: e.target.value })}
                                        >
                                            <option value="">-- Select Subject --</option>
                                            {[...new Set(allQuestions.map(q => q.subject))].filter(Boolean).map(subj => (
                                                <option key={subj} value={subj}>{subj}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Number of Questions</label>
                                        <input type="number" className="form-input" min="1" value={currentSubj.numQuestions} onChange={e => setCurrentSubj({ ...currentSubj, numQuestions: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Duration (minutes)</label>
                                        <input type="number" className="form-input" min="1" value={currentSubj.durationMinutes} onChange={e => setCurrentSubj({ ...currentSubj, durationMinutes: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Passing %</label>
                                        <input type="number" className="form-input" min="1" max="100" value={currentSubj.passingPercentage} onChange={e => setCurrentSubj({ ...currentSubj, passingPercentage: parseInt(e.target.value) || 0 })} />
                                    </div>
                                </div>
                                <button className="btn btn-sm btn-secondary mt-4 w-full" onClick={handleAddSubject}>
                                    <Plus size={16} style={{ marginRight: 6 }} /> Add Subject
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h2 style={{ fontSize: 18, marginBottom: 24 }}>Review & Generate</h2>
                            <div style={{ background: 'var(--bg-elevated)', padding: 24, borderRadius: 'var(--radius-lg)' }}>
                                <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px 0' }}>{form.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{form.description}</p>

                                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Subjects to Generate</h4>
                                <div style={{ display: 'grid', gap: 8 }}>
                                    {subjects.map((s, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                                            <span style={{ fontWeight: 500 }}>{s.subject}</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>{s.numQuestions} Qs ({s.durationMinutes}m)</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: 24, padding: 16, background: 'var(--warning-subtle)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', color: 'var(--warning)', fontSize: 13 }}>
                                    <strong>Note:</strong> Generating this examination will automatically pick random questions from the question bank for each subject. You can manage the schedule for each subject individually after generation.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                    <button className="btn btn-ghost" onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/admin/exams')}>
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>

                    {step < 3 ? (
                        <button className="btn btn-primary" onClick={() => {
                            if (step === 1 && !form.title.trim()) return toast.error('Title is required')
                            if (step === 2 && subjects.length === 0) return toast.error('Add at least one subject')
                            setStep(s => s + 1)
                        }}>
                            Next Step
                        </button>
                    ) : (
                        <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                            {creating ? 'Generating Examination...' : 'Generate Examination'}
                        </button>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}
