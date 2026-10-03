import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from './AdminLayout.jsx'
import { ArrowLeft, Check, BookOpen, Settings, Search, Database, Trash2, Plus } from 'lucide-react'
import { useToast } from '../../components/Toast.jsx'
import axios from 'axios'

const API = '/api'
const getToken = () => localStorage.getItem('adminToken')

export const AdminExamBuilderPage = () => {
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({ title: '', description: '', mode: 'Normal' })
    const [subjects, setSubjects] = useState([])
    const [availableSubjects, setAvailableSubjects] = useState([])
    const [currentSubj, setCurrentSubj] = useState({ subject: '', numQuestions: 10, durationMinutes: 60, passingPercentage: 50, easy: 30, medium: 50, hard: 20 })
    const [creating, setCreating] = useState(false)
    const [aiCopilotPrompt, setAiCopilotPrompt] = useState('')
    const [aiCopilotLoading, setAiCopilotLoading] = useState(false)
    const navigate = useNavigate()
    const toast = useToast()

    const handleAiCopilot = async () => {
        if (!aiCopilotPrompt.trim()) return
        setAiCopilotLoading(true)
        try {
            const token = getToken()
            const res = await axios.post(`${API}/ai/admin/exam-copilot`, { prompt: aiCopilotPrompt }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const result = res.data
            if (result.title) {
                // Auto-configure the exam
                setForm({
                    title: result.title,
                    description: result.description || '',
                    mode: result.mode === 'Zeroleak' ? 'Zeroleak' : 'Normal'
                })
                
                if (result.subjects && result.subjects.length > 0) {
                    setSubjects(result.subjects.map(s => ({
                        subject: s.subject,
                        numQuestions: s.numQuestions || 10,
                        durationMinutes: s.durationMinutes || Math.round((s.numQuestions || 10) * 1.5),
                        passingPercentage: s.passingPercentage || 50
                    })))
                }
                toast.success('AI Copilot successfully configured the exam!')
                setAiCopilotPrompt('')
                setStep(3)
            } else {
                toast.error('AI could not determine the exam structure.')
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'AI Copilot failed')
        } finally {
            setAiCopilotLoading(false)
        }
    }

    React.useEffect(() => {
        axios.get(`${API}/questions`, { headers: { Authorization: `Bearer ${getToken()}` } })
            .then(res => setAvailableSubjects(res.data.subjects || []))
            .catch(console.error)
    }, [])

    const handleAddSubject = () => {
        if (!currentSubj.subject) return toast.error('Please select or enter a subject')
        if (subjects.some(s => s.subject.toLowerCase() === currentSubj.subject.toLowerCase())) {
            return toast.error('Subject already added')
        }
        if (currentSubj.easy + currentSubj.medium + currentSubj.hard !== 100) {
            return toast.error('Difficulty percentages must sum to 100')
        }
        setSubjects([...subjects, { ...currentSubj }])
        setCurrentSubj({ subject: '', numQuestions: 10, durationMinutes: 60, passingPercentage: 50, easy: 30, medium: 50, hard: 20 })
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
                mode: form.mode,
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

            <div style={{ width: '100%' }}>
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
                            {/* AI Copilot Section */}
                            <div style={{ background: 'var(--brand-primary-subtle)', border: '1px solid var(--brand-primary-border)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 32 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--brand-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Search size={14} /></div>
                                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>AI Exam Copilot</h3>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="e.g. Build me a midterm on Operating Systems and Computer Networks." 
                                        value={aiCopilotPrompt} 
                                        onChange={e => setAiCopilotPrompt(e.target.value)}
                                        style={{ flex: 1, background: 'var(--bg-surface)' }}
                                    />
                                    <button className="btn btn-secondary" onClick={handleAiCopilot} disabled={aiCopilotLoading || !aiCopilotPrompt.trim()} style={{ background: 'var(--brand-primary)', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}>
                                        {aiCopilotLoading ? 'Generating...' : 'Auto-Build'}
                                    </button>
                                </div>
                            </div>

                            <h2 style={{ fontSize: 18, marginBottom: 24 }}>Examination Details</h2>
                            <div className="form-group mb-4">
                                <label className="form-label">Examination Title *</label>
                                <input className="form-input" placeholder="e.g. JEE Mains 2026" autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div className="form-group mb-4">
                                <label className="form-label">Description *</label>
                                <textarea className="form-textarea" style={{ minHeight: 120 }} placeholder="General instructions for the examination..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Exam Mode *</label>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="radio" name="examMode" value="Normal" checked={form.mode === 'Normal'} onChange={(e) => setForm(f => ({ ...f, mode: e.target.value }))} />
                                        <span style={{ fontWeight: form.mode === 'Normal' ? 600 : 400 }}>Normal</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="radio" name="examMode" value="Zeroleak" checked={form.mode === 'Zeroleak'} onChange={(e) => setForm(f => ({ ...f, mode: e.target.value }))} />
                                        <span style={{ fontWeight: form.mode === 'Zeroleak' ? 600 : 400, color: 'var(--brand-primary)' }}>Zeroleak Mode</span>
                                    </label>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                    {form.mode === 'Normal' ? 'Questions are generated and locked immediately upon creation.' : 'No questions are stored in the exam. Each student gets a uniquely generated set of questions when they start.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <h2 style={{ fontSize: 18, margin: 0 }}>Configure Subjects</h2>
                            </div>
                            

                            {/* Subject List */}
                            {subjects.length > 0 && (
                                <div style={{ marginBottom: 24, display: 'grid', gap: 12 }}>
                                    {subjects.map((s, idx) => (
                                        <div key={idx} style={{ padding: 16, border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.subject}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                    {s.numQuestions} Qs • {s.durationMinutes} mins • {s.passingPercentage}% Pass • {s.easy !== undefined ? `${s.easy}% E / ${s.medium}% M / ${s.hard}% H` : '30% E / 50% M / 20% H'}
                                                </div>
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
                                        <label className="form-label">Subject Name *</label>
                                        <select 
                                            className="form-select" 
                                            value={currentSubj.subject} 
                                            onChange={e => setCurrentSubj({ ...currentSubj, subject: e.target.value })}
                                        >
                                            <option value="">-- Select Subject --</option>
                                            {availableSubjects.map(subj => (
                                                <option key={subj} value={subj}>{subj}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Number of Questions *</label>
                                        <input type="number" className="form-input" min="1" value={currentSubj.numQuestions} onChange={e => setCurrentSubj({ ...currentSubj, numQuestions: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Duration (minutes) *</label>
                                        <input type="number" className="form-input" min="1" value={currentSubj.durationMinutes} onChange={e => setCurrentSubj({ ...currentSubj, durationMinutes: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Passing % *</label>
                                        <input type="number" className="form-input" min="1" max="100" value={currentSubj.passingPercentage} onChange={e => setCurrentSubj({ ...currentSubj, passingPercentage: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Easy % *</label>
                                        <input type="number" className="form-input" min="0" max="100" value={currentSubj.easy} onChange={e => setCurrentSubj({ ...currentSubj, easy: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Medium % *</label>
                                        <input type="number" className="form-input" min="0" max="100" value={currentSubj.medium} onChange={e => setCurrentSubj({ ...currentSubj, medium: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Hard % *</label>
                                        <input type="number" className="form-input" min="0" max="100" value={currentSubj.hard} onChange={e => setCurrentSubj({ ...currentSubj, hard: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingBottom: '12px' }}>
                                        <div style={{ fontSize: 13, color: (currentSubj.easy + currentSubj.medium + currentSubj.hard === 100) ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                            Total: {currentSubj.easy + currentSubj.medium + currentSubj.hard}% {currentSubj.easy + currentSubj.medium + currentSubj.hard !== 100 && '(Must be 100%)'}
                                        </div>
                                    </div>
                                </div>
                                <button className="btn btn-sm btn-secondary mt-4 w-full" onClick={handleAddSubject} disabled={currentSubj.easy + currentSubj.medium + currentSubj.hard !== 100}>
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
                                    <strong>Note:</strong> {form.mode === 'Normal' ? 'Generating this examination will automatically pick random questions from the question bank for each subject.' : 'In Zeroleak mode, no questions will be picked now. Questions will be dynamically generated for each student when they start the exam.'} You can manage the schedule for each subject individually after generation.
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
