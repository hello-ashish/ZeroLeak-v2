import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { Plus, Send, Edit2, Trash2, Download, Upload, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import Papa from 'papaparse'
import { StatusBadge } from '../../components/StatusBadge.jsx'
import { Modal } from '../../components/Modal.jsx'
import { useToast } from '../../components/Toast.jsx'

const ProfessorCreateBatchPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const toast = useToast()

    const isEditMode = !!id

    const [batch, setBatch] = useState(null)
    const [loading, setLoading] = useState(isEditMode)

    // Batch Shell Form
    const [batchTitle, setBatchTitle] = useState('')
    const [batchSubject, setBatchSubject] = useState('')
    const [batchDescription, setBatchDescription] = useState('')
    const [isCreatingBatch, setIsCreatingBatch] = useState(false)

    // Question Management
    const [title, setTitle] = useState('')
    const [options, setOptions] = useState(['', '', '', ''])
    const [correctAnswer, setCorrectAnswer] = useState('')
    const [difficultyLevel, setDifficultyLevel] = useState('easy')
    const [topic, setTopic] = useState('')
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0)
    const [editingQuestionId, setEditingQuestionId] = useState(null)
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)

    // Preview / Import States
    const [previewQuestions, setPreviewQuestions] = useState(null)
    const [showTemplatePreview, setShowTemplatePreview] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [submittingBatchId, setSubmittingBatchId] = useState(null)

    useEffect(() => {
        if (isEditMode) {
            fetchBatchData()
        } else {
            setBatchTitle('')
            setBatchSubject('')
            setBatchDescription('')
            setBatch(null)
        }
    }, [id])

    const fetchBatchData = async () => {
        try {
            const token = localStorage.getItem('profToken')
            // Fetch all batches because there isn't a specific get batch by id endpoint
            const response = await axios.get('http://localhost:4000/api/professor/batches', {
                headers: { Authorization: `Bearer ${token}` }
            })
            const batches = response.data.batches
            const currentBatch = batches.find(b => b._id === id)
            if (currentBatch) {
                setBatch(currentBatch)
                setBatchTitle(currentBatch.title)
                setBatchSubject(currentBatch.subject)
                setBatchDescription(currentBatch.description || '')
            } else {
                toast.error("Batch not found")
                navigate('/professor/batches')
            }
        } catch (error) {
            console.error("Error fetching batch:", error)
            toast.error("Failed to load batch")
        } finally {
            setLoading(false)
        }
    }

    const handleCreateBatch = async (e) => {
        e.preventDefault()
        if (isEditMode) {
            // Right now we don't have an endpoint to update batch details in the controller, so we just skip.
            toast.success("Batch details updated (mock)")
            return
        }

        setIsCreatingBatch(true)
        try {
            const token = localStorage.getItem('profToken')
            const response = await axios.post('http://localhost:4000/api/professor/batches', {
                title: batchTitle,
                subject: batchSubject,
                description: batchDescription
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success("Batch created successfully")
            const createdId = response.data.batch?._id
            if (createdId) {
                navigate(`/professor/batches/${createdId}/edit`)
            } else {
                navigate('/professor/batches')
            }
        } catch (error) {
            toast.error("Error creating batch: " + (error.response?.data?.message || "Server Error"))
        } finally {
            setIsCreatingBatch(false)
        }
    }

    // -- Question Handlers --
    const handleOptionChange = (idx, value) => {
        const newOptions = [...options];
        newOptions[idx] = value;
        setOptions(newOptions);
    };

    const handleAddQuestionToBatch = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('profToken');
            const payload = { title, options, correctAnswer, difficultyLevel, subject: batchSubject, topic, correctAnswerIndex: Number(correctAnswerIndex) };

            if (editingQuestionId) {
                await axios.put(`http://localhost:4000/api/professor/batches/${id}/questions/${editingQuestionId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`http://localhost:4000/api/professor/batches/${id}/questions`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setTitle(''); setOptions(['', '', '', '']); setCorrectAnswer(''); setCorrectAnswerIndex(0); setTopic('');
            setEditingQuestionId(null);
            setIsQuestionModalOpen(false);
            fetchBatchData(); // Refresh the batch data
            toast.success(editingQuestionId ? "Question updated" : "Question added");
        } catch (error) {
            toast.error("Error: " + (error.response?.data?.message || "Server Error"));
        }
    };

    const handleEditQuestion = (q) => {
        setEditingQuestionId(q._id);
        setTitle(q.title || '');
        setOptions(q.options && q.options.length === 4 ? q.options : ['', '', '', '']);
        setCorrectAnswer(q.correctAnswer || '');
        setCorrectAnswerIndex(q.correctAnswerIndex || 0);
        setDifficultyLevel(q.difficultyLevel || 'easy');
        setTopic(q.topic || '');
        setIsQuestionModalOpen(true);
    };

    const handleDeleteQuestion = async (questionId) => {
        if (!window.confirm("Are you sure you want to delete this question?")) return;
        try {
            const token = localStorage.getItem('profToken');
            await axios.delete(`http://localhost:4000/api/professor/batches/${id}/questions/${questionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchBatchData();
            toast.success("Question deleted");
        } catch (error) {
            toast.error("Error: " + (error.response?.data?.message || "Server Error"));
        }
    };

    const submitBatch = async () => {
        setSubmittingBatchId(id);
        try {
            const token = localStorage.getItem('profToken');
            await axios.post(`http://localhost:4000/api/professor/batches/${id}/submit`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Batch submitted successfully");
            navigate('/professor/batches');
        } catch (error) {
            toast.error("Error submitting batch");
        } finally {
            setSubmittingBatchId(null);
        }
    };

    const handleDeleteBatch = async () => {
        if (!window.confirm("Are you sure you want to delete this entire batch?")) return;
        try {
            const token = localStorage.getItem('profToken');
            await axios.delete(`http://localhost:4000/api/professor/batches/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Batch deleted");
            navigate('/professor/batches');
        } catch (error) {
            toast.error("Error: " + (error.response?.data?.message || "Server Error"));
        }
    };

    const downloadTemplate = () => {
        const headers = ["Title", "Option 1", "Option 2", "Option 3", "Option 4", "Correct Option Index (0-3)", "Difficulty (easy/medium/hard)", "Topic"];
        const sampleRow = ["What is the capital of France?", "London", "Berlin", "Paris", "Madrid", "2", "easy", "Geography"];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + sampleRow.join(",");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Question_Template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data;
                if (rows.length < 2) {
                    toast.error("CSV is empty or missing data rows.");
                    return;
                }

                const questions = [];
                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i];
                    if (cols.length < 8) continue;

                    const correctIdx = parseInt(cols[5]);
                    let exactCorrectText = cols[1 + correctIdx];
                    if (!exactCorrectText) exactCorrectText = cols[1]; // fallback

                    questions.push({
                        title: cols[0],
                        options: [cols[1], cols[2], cols[3], cols[4]],
                        correctAnswer: exactCorrectText,
                        correctAnswerIndex: isNaN(correctIdx) ? 0 : correctIdx,
                        difficultyLevel: (cols[6] || '').toLowerCase().trim(),
                        topic: (cols[7] || '').trim()
                    });
                }

                if (questions.length === 0) {
                    toast.error("No valid questions found in CSV.");
                    return;
                }

                setPreviewQuestions(questions);
            }
        });
        e.target.value = null;
    };

    const confirmImport = async () => {
        setIsImporting(true);
        try {
            const token = localStorage.getItem('profToken');
            await axios.post(`http://localhost:4000/api/professor/batches/${id}/questions/bulk`, { questions: previewQuestions }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchBatchData();
            toast.success(`${previewQuestions.length} questions imported successfully!`);
            setPreviewQuestions(null);
        } catch (error) {
            toast.error("Error importing questions: " + (error.response?.data?.message || error.message));
        } finally {
            setIsImporting(false);
        }
    };

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="spin" size={32} /></div>
    }

    return (
        <>
            {/* Template Preview Modal */}
            <Modal open={showTemplatePreview} onClose={() => setShowTemplatePreview(false)} title="CSV Template Preview" size="full">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        This is how your CSV file should be structured. The first row must contain these exact headers.
                    </p>
                    <div style={{ background: 'var(--bg-body)', borderRadius: '8px', border: '1px solid var(--border-subtle)', maxHeight: '400px', overflow: 'auto' }}>
                        <table className="table" style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', background: 'var(--bg-surface)' }}>Title</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', background: 'var(--bg-surface)' }}>Option 1</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', background: 'var(--bg-surface)' }}>Option 2</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', background: 'var(--bg-surface)' }}>Option 3</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', background: 'var(--bg-surface)' }}>Option 4</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', background: 'var(--bg-surface)' }}>Correct Option Index (0-3)</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', background: 'var(--bg-surface)' }}>Difficulty (easy/medium/hard)</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', background: 'var(--bg-surface)' }}>Topic</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>What is the capital of France?</td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>London</td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>Berlin</td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>Paris</td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>Madrid</td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>2</td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>easy</td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>Geography</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="flex gap-3" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                        <button className="btn btn-ghost" onClick={() => setShowTemplatePreview(false)}>Close</button>
                        <button className="btn btn-primary flex items-center gap-2" onClick={() => { downloadTemplate(); setShowTemplatePreview(false); }}>
                            <Download size={16} /> Download CSV
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Import Preview Modal */}
            <Modal
                open={!!previewQuestions}
                onClose={() => setPreviewQuestions(null)}
                title={`Preview Imported Questions (${previewQuestions?.length || 0})`}
                size="full"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setPreviewQuestions(null)} disabled={isImporting}>Cancel</button>
                        <button className="btn btn-primary" onClick={confirmImport} disabled={isImporting}>
                            {isImporting ? <Loader2 size={16} className="spin" style={{ marginRight: 6 }} /> : <Upload size={16} style={{ marginRight: 6 }} />}
                            {isImporting ? 'Importing...' : 'Confirm Import'}
                        </button>
                    </>
                }
            >
                <div style={{ padding: '0px 0', overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gap: 16 }}>
                        {previewQuestions?.map((q, idx) => (
                            <div key={idx} style={{ padding: 16, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-surface)' }}>
                                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: 4 }}>Q{idx + 1}</span>
                                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5 }}>{q.title}</div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingLeft: 40, marginBottom: 16 }}>
                                    {q.options.map((opt, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, border: i === q.correctAnswerIndex ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)', background: i === q.correctAnswerIndex ? 'var(--success-subtle)' : 'var(--bg-elevated)' }}>
                                            <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: i === q.correctAnswerIndex ? 'var(--success)' : 'var(--bg-surface)', color: i === q.correctAnswerIndex ? 'white' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>{String.fromCharCode(65 + i)}</span>
                                            <span style={{ fontSize: 14, color: i === q.correctAnswerIndex ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{opt}</span>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 12, paddingLeft: 40 }}>
                                    <StatusBadge status={q.difficultyLevel} />
                                    {q.topic && <span style={{ fontSize: 12, color: 'var(--brand-primary)', background: 'var(--brand-primary-subtle)', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>{q.topic}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            <div className="page-header" style={{ marginBottom: 32 }}>
                <div className="page-header-top">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 4 }}>
                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate('/professor/batches')} style={{ padding: 4 }}>
                                <ArrowLeft size={16} />
                            </button>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Manage Content
                            </p>
                        </div>
                        <h1 className="page-title" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
                            {isEditMode ? 'Edit Batch' : 'Create New Batch'}
                        </h1>
                        <p className="page-subtitle" style={{ fontSize: 14 }}>
                            {isEditMode ? 'Add or edit questions in this pool.' : 'Start building a new pool of questions for your exams.'}
                        </p>
                    </div>
                    {isEditMode && batch && (
                        <div className="page-actions">
                            <StatusBadge status={batch.status} />
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {isEditMode && batch ? (
                    <div className="card" style={{ padding: '24px', display: 'flex', gap: '24px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Batch Subject</div>
                            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{batch.subject}</div>
                        </div>
                        <div style={{ width: '1px', height: 40, background: 'var(--border-default)' }}></div>
                        <div style={{ flex: 2 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Batch Title</div>
                            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{batch.title}</div>
                        </div>
                        {batch.description && (
                            <>
                                <div style={{ width: '1px', height: 40, background: 'var(--border-default)' }}></div>
                                <div style={{ flex: 2 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Description</div>
                                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{batch.description}</div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="card">
                        <div className="card-header" style={{ padding: '20px 24px' }}>
                            <h2 className="card-title">Batch Details</h2>
                        </div>
                        <div className="card-body" style={{ padding: '24px' }}>
                            <form onSubmit={handleCreateBatch} style={{ display: 'grid', gap: '1rem' }}>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Batch Title *</label>
                                    <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} type="text" placeholder="e.g. Physics Midterm Pool" value={batchTitle} onChange={(e) => setBatchTitle(e.target.value)} required />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Subject *</label>
                                    <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} type="text" placeholder="e.g. Physics" value={batchSubject} onChange={(e) => setBatchSubject(e.target.value)} required />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Description (Optional)</label>
                                    <textarea className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)', minHeight: 80 }} placeholder="Brief description of the batch content" value={batchDescription} onChange={(e) => setBatchDescription(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: 16 }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/professor/batches')} disabled={isCreatingBatch}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={isCreatingBatch}>
                                        {isCreatingBatch ? <Loader2 size={16} className="spin" style={{ marginRight: 6 }} /> : <Plus size={16} style={{ marginRight: 6 }} />}
                                        {isCreatingBatch ? 'Creating...' : 'Create Batch'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <Modal
                    open={isQuestionModalOpen}
                    onClose={() => { setIsQuestionModalOpen(false); setEditingQuestionId(null); setTitle(''); setOptions(['', '', '', '']); setCorrectAnswer(''); setTopic(''); }}
                    title={editingQuestionId ? 'Edit Question' : 'Add Question'}
                    size="lg"
                >
                    <form onSubmit={handleAddQuestionToBatch} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Question Text *</label>
                            <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} type="text" placeholder="e.g. What is React?" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Subject (Inherited) *</label>
                                <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-secondary)', opacity: 0.7 }} type="text" placeholder="Subject" value={batchSubject} readOnly disabled />
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Topic *</label>
                                <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} type="text" placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Difficulty *</label>
                                <select className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}>
                                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Options *</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {[0, 1, 2, 3].map(index => (
                                    <input key={index} className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} type="text" placeholder={`Option ${index + 1}`} value={options[index]} onChange={(e) => handleOptionChange(index, e.target.value)} required />
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Exact Correct Answer Text (optional)</label>
                                <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} type="text" placeholder="Exact Correct Answer Text" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} />
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Correct Option *</label>
                                <select className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} value={correctAnswerIndex} onChange={(e) => setCorrectAnswerIndex(e.target.value)}>
                                    <option value={0}>Option 1 is correct</option><option value={1}>Option 2 is correct</option><option value={2}>Option 3 is correct</option><option value={3}>Option 4 is correct</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <button type="submit" className="btn btn-primary">{editingQuestionId ? 'Update Question' : 'Save Question'}</button>
                        </div>
                    </form>
                </Modal>

                {isEditMode && batch && (
                    <div className="card" style={{ overflow: 'visible' }}>
                        <div className="card-header" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="card-title">Questions in Batch ({batch.questions?.length || 0})</h2>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-primary btn-sm" onClick={() => setIsQuestionModalOpen(true)}>
                                    <Plus size={14} style={{ marginRight: 4 }} /> Add Question
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowTemplatePreview(true)}>
                                    <Download size={14} style={{ marginRight: 4 }} /> CSV Template
                                </button>
                                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', margin: 0 }}>
                                    <Upload size={14} style={{ marginRight: 4 }} /> Import CSV
                                    <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
                                </label>
                            </div>
                        </div>
                        <div className="card-body" style={{ padding: '24px' }}>
                            {batch.questions && batch.questions.length > 0 ? (
                                <div style={{ display: 'grid', gap: 12 }}>
                                    {batch.questions.map((q, idx) => (
                                        <div key={q._id} style={{ padding: 16, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-surface)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                                                    {idx + 1}. {q.title}
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleEditQuestion(q)} title="Edit Question">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteQuestion(q._id)} title="Delete Question">
                                                        <Trash2 size={14} />
                                                    </button>
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
                            ) : (
                                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)' }}>
                                    No questions added yet.
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8, marginTop: 24, borderTop: '1px solid var(--border-default)', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, margin: '24px -24px -24px -24px', justifyContent: 'space-between', position: 'sticky', bottom: 0, background: 'var(--bg-card)', zIndex: 10, boxShadow: '0 -4px 12px rgba(0,0,0,0.1)' }}>
                                <button className="btn btn-danger btn-sm" style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }} onClick={handleDeleteBatch}>
                                    <Trash2 size={14} style={{ marginRight: 4 }} /> Delete Batch
                                </button>
                                <button className="btn btn-primary btn-sm" onClick={submitBatch} disabled={!batch.questions || batch.questions.length === 0 || submittingBatchId === batch._id}>
                                    {submittingBatchId === batch._id ? <Loader2 size={14} className="spin" style={{ marginRight: 4 }} /> : <Send size={14} style={{ marginRight: 4 }} />}
                                    {submittingBatchId === batch._id ? 'Submitting...' : 'Submit to Admin'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

export default ProfessorCreateBatchPage
