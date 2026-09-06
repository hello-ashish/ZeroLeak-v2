import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from './AdminLayout.jsx'
import { ArrowLeft, Check, BookOpen, Clock, Settings, Upload } from 'lucide-react'
import { useToast } from '../../components/Toast.jsx'
import axios from 'axios'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('adminToken')

export const AdminExamBuilderPage = () => {
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({ title: '', description: '', durationMinutes: 60, passingPercentage: 50, status: 'Draft' })
    const [creating, setCreating] = useState(false)
    const navigate = useNavigate()
    const toast = useToast()

    const handleCreate = async () => {
        setCreating(true)
        try {
            await axios.post(`${API}/exams`, {
                title: form.title,
                description: form.description,
                duration: form.durationMinutes,
                passingPercentage: form.passingPercentage,
                questions: [], // Admin will add questions later in the detailed view
                status: form.status
            }, { headers: { Authorization: `Bearer ${getToken()}` } })
            toast.success('Exam created successfully!')
            navigate('/admin/exams')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create exam')
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
                        <h1 className="page-title" style={{ fontSize: 24 }}>Exam Builder</h1>
                        <p className="page-subtitle">Configure a new examination</p>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {/* Wizard Steps */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
                    {[
                        { num: 1, label: 'Details', icon: <BookOpen size={16} /> },
                        { num: 2, label: 'Configuration', icon: <Settings size={16} /> },
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
                        <div style={{ animation: 'dialogScale 200ms ease' }}>
                            <h2 style={{ fontSize: 18, marginBottom: 24 }}>Basic Information</h2>
                            <div className="form-group mb-4">
                                <label className="form-label">Exam Title *</label>
                                <input className="form-input" placeholder="e.g. Computer Science Midterm" autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description *</label>
                                <textarea className="form-textarea" style={{ minHeight: 120 }} placeholder="What topics are covered in this exam?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ animation: 'dialogScale 200ms ease' }}>
                            <h2 style={{ fontSize: 18, marginBottom: 24 }}>Exam Rules & Configuration</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div className="form-group">
                                    <label className="form-label">Duration (minutes) *</label>
                                    <div className="search-input-wrap">
                                        <Clock size={16} style={{ color: 'var(--text-tertiary)' }} />
                                        <input className="search-input" type="number" min="5" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Passing Percentage</label>
                                    <div className="search-input-wrap">
                                        <Check size={16} style={{ color: 'var(--text-tertiary)' }} />
                                        <input className="search-input" type="number" min="0" max="100" value={form.passingPercentage} onChange={e => setForm(f => ({ ...f, passingPercentage: e.target.value }))} />
                                    </div>
                                </div>
                            </div>
                            <div className="form-group mt-4">
                                <label className="form-label">Initial Status</label>
                                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                    <option value="Draft">Draft - Hidden from students</option>
                                    <option value="Scheduled">Scheduled - Visible but locked</option>
                                    <option value="Live">Live - Open for attempts</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div style={{ animation: 'dialogScale 200ms ease' }}>
                            <h2 style={{ fontSize: 18, marginBottom: 24 }}>Review & Publish</h2>
                            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', padding: 24, marginBottom: 24 }}>
                                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                    <div style={{ width: 120, color: 'var(--text-secondary)', fontSize: 13 }}>Title</div>
                                    <div style={{ fontWeight: 600 }}>{form.title || 'Untitled Exam'}</div>
                                </div>
                                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                    <div style={{ width: 120, color: 'var(--text-secondary)', fontSize: 13 }}>Duration</div>
                                    <div>{form.durationMinutes} minutes</div>
                                </div>
                                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                    <div style={{ width: 120, color: 'var(--text-secondary)', fontSize: 13 }}>Pass Requirement</div>
                                    <div>{form.passingPercentage}%</div>
                                </div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div style={{ width: 120, color: 'var(--text-secondary)', fontSize: 13 }}>Status</div>
                                    <div>
                                        <span className={`badge badge-${form.status === 'Live' ? 'live' : form.status === 'Scheduled' ? 'scheduled' : 'draft'}`}>
                                            {form.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 16, background: 'var(--info-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--info)' }}>
                                <Upload size={20} />
                                <span style={{ fontSize: 13 }}>After creation, you will be redirected to the Exam Details page where you can add questions from the Question Bank.</span>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-default)' }}>
                        <button className="btn btn-ghost" onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/admin/exams')} disabled={creating}>
                            {step > 1 ? '← Back' : 'Cancel'}
                        </button>
                        
                        {step < 3 ? (
                            <button className="btn btn-primary" onClick={() => {
                                if (step === 1 && !form.title.trim()) {
                                    toast.error('Title is required')
                                    return
                                }
                                setStep(s => s + 1)
                            }}>Next Step →</button>
                        ) : (
                            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                                {creating ? 'Creating...' : '✓ Create Exam Workspace'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
