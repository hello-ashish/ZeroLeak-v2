import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Plus, Send, AlertCircle, PackageOpen, Edit2, Trash2, Eye, EyeOff, Download, Upload, X, Loader2 } from 'lucide-react'
import Papa from 'papaparse'
import { StatusBadge } from '../../components/StatusBadge.jsx'
import { Skeleton } from '../../components/SkeletonLoader.jsx'
import { Modal } from '../../components/Modal.jsx'
import { useToast } from '../../components/Toast.jsx'

const ProfessorBatchesPage = () => {
    const [batches, setBatches] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()
    const toast = useToast()

    // Create Batch States
    const [batchTitle, setBatchTitle] = useState('')
    const [batchSubject, setBatchSubject] = useState('')
    const [batchDescription, setBatchDescription] = useState('')
    const [activeBatchId, setActiveBatchId] = useState(null)
    const [isCreating, setIsCreating] = useState(false)
    const [isCreatingBatch, setIsCreatingBatch] = useState(false)

    // Add Question States
    const [title, setTitle] = useState('')
    const [options, setOptions] = useState(['', '', '', ''])
    const [correctAnswer, setCorrectAnswer] = useState('')
    const [difficultyLevel, setDifficultyLevel] = useState('easy')
    const [subject, setSubject] = useState('')
    const [topic, setTopic] = useState('')
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0)
    const [editingQuestionId, setEditingQuestionId] = useState(null)
    const [expandedBatches, setExpandedBatches] = useState({})
    
    // Preview States
    const [previewQuestions, setPreviewQuestions] = useState(null)
    const [previewBatchId, setPreviewBatchId] = useState(null)
    const [showTemplatePreview, setShowTemplatePreview] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [submittingBatchId, setSubmittingBatchId] = useState(null)

    const toggleBatchExpansion = (batchId) => {
        setExpandedBatches(prev => ({ ...prev, [batchId]: !prev[batchId] }))
    }

    useEffect(() => {
        const token = localStorage.getItem('profToken')
        if (!token) {
            navigate('/professor/login')
        } else {
            fetchMyBatches(token)
        }
    }, [navigate])

    const fetchMyBatches = async (token) => {
        try {
            const response = await axios.get('http://localhost:4000/api/professor/batches', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setBatches(response.data.batches)
        } catch (error) {
            console.error("Error fetching batches: ", error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateBatch = async (e) => {
        e.preventDefault()
        setIsCreatingBatch(true)
        try {
            const token = localStorage.getItem('profToken')
            await axios.post('http://localhost:4000/api/professor/batches', {
                title: batchTitle,
                subject: batchSubject,
                description: batchDescription
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setBatchTitle('')
            setBatchSubject('')
            setBatchDescription('')
            setIsCreating(false)
            fetchMyBatches(token)
            toast.success("Batch created successfully")
        } catch (error) {
            toast.error("Error creating batch: " + (error.response?.data?.message || "Server Error"))
        } finally {
            setIsCreatingBatch(false)
        }
    }

    const handleOptionChange = (idx, value) => {
        const newOptions = [...options];
        newOptions[idx] = value;
        setOptions(newOptions);
    };

    const handleAddQuestionToBatch = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('profToken');
            const payload = { title, options, correctAnswer, difficultyLevel, subject, topic, correctAnswerIndex: Number(correctAnswerIndex) };

            if (editingQuestionId) {
                await axios.put(`http://localhost:4000/api/professor/batches/${activeBatchId}/questions/${editingQuestionId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`http://localhost:4000/api/professor/batches/${activeBatchId}/questions`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setTitle(''); setOptions(['', '', '', '']); setCorrectAnswer(''); setCorrectAnswerIndex(0); setTopic('');
            setActiveBatchId(null); setEditingQuestionId(null);
            fetchMyBatches(token);
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || "Server Error"));
        }
    };

    const handleEditQuestion = (batchId, batchSubject, q) => {
        setActiveBatchId(batchId);
        setEditingQuestionId(q._id);
        setSubject(batchSubject);
        setTitle(q.title || '');
        setOptions(q.options && q.options.length === 4 ? q.options : ['', '', '', '']);
        setCorrectAnswer(q.correctAnswer || '');
        setCorrectAnswerIndex(q.correctAnswerIndex || 0);
        setDifficultyLevel(q.difficultyLevel || 'easy');
        setTopic(q.topic || '');
    };

    const handleDeleteQuestion = async (batchId, questionId) => {
        if (!window.confirm("Are you sure you want to delete this question?")) return;
        try {
            const token = localStorage.getItem('profToken');
            await axios.delete(`http://localhost:4000/api/professor/batches/${batchId}/questions/${questionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMyBatches(token);
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || "Server Error"));
        }
    };

    const submitBatch = async (batchId) => {
        setSubmittingBatchId(batchId);
        try {
            const token = localStorage.getItem('profToken');
            await axios.post(`http://localhost:4000/api/professor/batches/${batchId}/submit`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMyBatches(token);
            toast.success("Batch submitted successfully");
        } catch (error) {
            toast.error("Error submitting batch");
        } finally {
            setSubmittingBatchId(null);
        }
    };

    const handleDeleteBatch = async (batchId) => {
        if (!window.confirm("Are you sure you want to delete this batch?")) return;
        try {
            const token = localStorage.getItem('profToken');
            await axios.delete(`http://localhost:4000/api/professor/batches/${batchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMyBatches(token);
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || "Server Error"));
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

    const handleFileUpload = async (e, batchId) => {
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
                
                // Show preview
                setPreviewQuestions(questions);
                setPreviewBatchId(batchId);
            }
        });
        e.target.value = null;
    };

    const confirmImport = async () => {
        setIsImporting(true);
        try {
            const token = localStorage.getItem('profToken');
            await axios.post(`http://localhost:4000/api/professor/batches/${previewBatchId}/questions/bulk`, { questions: previewQuestions }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMyBatches(token);
            toast.success(`${previewQuestions.length} questions imported successfully!`);
            setPreviewQuestions(null);
            setPreviewBatchId(null);
        } catch (error) {
            toast.error("Error importing questions: " + (error.response?.data?.message || error.message));
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
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
                    <div className="page-actions">
                        <button className="btn btn-primary" onClick={() => setIsCreating(!isCreating)}>
                            {isCreating ? 'Cancel' : <><Plus size={16} /> New Batch</>}
                        </button>
                    </div>
                </div>
            </div>

            {isCreating && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header" style={{ padding: '20px 24px' }}>
                        <h2 className="card-title">Create a New Batch</h2>
                    </div>
                    <div className="card-body" style={{ padding: '24px' }}>
                        <form onSubmit={handleCreateBatch} style={{ display: 'grid', gap: '1rem' }}>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Batch Title</label>
                                <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} type="text" placeholder="e.g. Physics Midterm Pool" value={batchTitle} onChange={(e) => setBatchTitle(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Subject</label>
                                <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} type="text" placeholder="e.g. Physics" value={batchSubject} onChange={(e) => setBatchSubject(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Description (Optional)</label>
                                <textarea className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)', minHeight: 80 }} placeholder="Brief description of the batch content" value={batchDescription} onChange={(e) => setBatchDescription(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: 16 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)} disabled={isCreatingBatch}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isCreatingBatch}>
                                    {isCreatingBatch ? <Loader2 size={16} className="spin" style={{ marginRight: 6 }} /> : null}
                                    {isCreatingBatch ? 'Creating...' : 'Create Batch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeBatchId && (
                <div className="card" style={{ marginBottom: 24, border: '1px solid var(--brand-primary)' }}>
                    <div className="card-header" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="card-title">{editingQuestionId ? 'Edit Question' : 'Add Question to Batch'}</h2>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setActiveBatchId(null); setEditingQuestionId(null); setTitle(''); setOptions(['', '', '', '']); setCorrectAnswer(''); setTopic(''); }}>Close</button>
                    </div>
                    <div className="card-body" style={{ padding: '24px' }}>
                        <form onSubmit={handleAddQuestionToBatch} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Question Text</label>
                                <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} type="text" placeholder="e.g. What is React?" value={title} onChange={(e) => setTitle(e.target.value)} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Subject (Inherited)</label>
                                    <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-secondary)', opacity: 0.7 }} type="text" placeholder="Subject" value={subject} readOnly disabled />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Topic</label>
                                    <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} type="text" placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} required />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Difficulty</label>
                                    <select className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}>
                                        <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Options</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    {[0, 1, 2, 3].map(index => (
                                        <input key={index} className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} type="text" placeholder={`Option ${index + 1}`} value={options[index]} onChange={(e) => handleOptionChange(index, e.target.value)} required />
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Exact Correct Answer Text</label>
                                    <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} type="text" placeholder="Exact Correct Answer Text" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} required />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Correct Option</label>
                                    <select className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-primary)' }} value={correctAnswerIndex} onChange={(e) => setCorrectAnswerIndex(e.target.value)}>
                                        <option value={0}>Option 1 is correct</option><option value={1}>Option 2 is correct</option><option value={2}>Option 3 is correct</option><option value={3}>Option 4 is correct</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="submit" className="btn btn-primary">Save Question</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gap: 24 }}>
                {batches.map((batch) => (
                    <div className="card" key={batch._id}>
                        <div className="card-body" style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: 'var(--text-primary)' }}>{batch.title}</h3>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>Subject: {batch.subject} • {batch.questions?.length || 0} Questions</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {batch.questions && batch.questions.length > 0 && (batch.status === 'Draft' || batch.status === 'MarkForReview' || batch.status === 'Rejected') && (
                                        <button className="btn btn-ghost btn-sm" onClick={() => toggleBatchExpansion(batch._id)}>
                                            {expandedBatches[batch._id] ? <><EyeOff size={14} style={{ marginRight: 6 }} /> Hide Questions</> : <><Eye size={14} style={{ marginRight: 6 }} /> View Questions</>}
                                        </button>
                                    )}
                                    <StatusBadge status={batch.status} />
                                </div>
                            </div>

                            {batch.adminMessage && (
                                <div style={{ background: 'var(--danger-subtle)', borderLeft: '3px solid var(--danger)', padding: 12, marginBottom: 16, borderRadius: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
                                        <AlertCircle size={14} /> Admin Feedback
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>{batch.adminMessage}</p>
                                </div>
                            )}

                            {expandedBatches[batch._id] && batch.questions && batch.questions.length > 0 && (batch.status === 'Draft' || batch.status === 'MarkForReview' || batch.status === 'Rejected') && (
                                <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                                    {batch.questions.map((q, idx) => (
                                        <div key={q._id} style={{ padding: 16, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-surface)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                                                    {idx + 1}. {q.title}
                                                </div>
                                                {(batch.status === 'Draft' || batch.status === 'MarkForReview' || batch.status === 'Rejected') && (
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleEditQuestion(batch._id, batch.subject, q)} title="Edit Question">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteQuestion(batch._id, q._id)} title="Delete Question">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
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

                            {batch.status !== 'Submitted' && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 24, borderTop: '1px solid var(--border-default)', paddingTop: 16, justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {(batch.status === 'Draft' || batch.status === 'MarkForReview' || batch.status === 'Rejected') && (
                                            <>
                                                <button className="btn btn-secondary btn-sm" onClick={() => {
                                                    setActiveBatchId(batch._id);
                                                    setEditingQuestionId(null);
                                                    setSubject(batch.subject);
                                                    setTitle(''); setOptions(['', '', '', '']); setCorrectAnswer(''); setCorrectAnswerIndex(0); setTopic('');
                                                }}>
                                                    <Plus size={14} style={{ marginRight: 4 }} /> Add Question
                                                </button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => setShowTemplatePreview(true)}>
                                                    <Download size={14} style={{ marginRight: 4 }} /> Template
                                                </button>
                                                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', margin: 0 }}>
                                                    <Upload size={14} style={{ marginRight: 4 }} /> Import CSV
                                                    <input type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, batch._id)} />
                                                </label>
                                                <button className="btn btn-primary btn-sm" onClick={() => submitBatch(batch._id)} disabled={!batch.questions || batch.questions.length === 0 || submittingBatchId === batch._id}>
                                                    {submittingBatchId === batch._id ? <Loader2 size={14} className="spin" style={{ marginRight: 4 }} /> : <Send size={14} style={{ marginRight: 4 }} />}
                                                    {submittingBatchId === batch._id ? 'Submitting...' : 'Submit to Admin'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <button className="btn btn-danger btn-sm" style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }} onClick={() => handleDeleteBatch(batch._id)}>
                                        <Trash2 size={14} style={{ marginRight: 4 }} /> Delete Batch
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
                ) : batches.length === 0 && !isCreating ? (
                    <div className="card" style={{ padding: '48px', textAlign: 'center' }}>
                        <PackageOpen size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto 16px', opacity: 0.5 }} />
                        <h3 style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 4 }}>No Batches Found</h3>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 24 }}>You haven't created any question pools yet.</p>
                        <button className="btn btn-primary" onClick={() => setIsCreating(true)}>Create Your First Batch</button>
                    </div>
                ) : null}
            </div>
        </>
    )
}

export default ProfessorBatchesPage
