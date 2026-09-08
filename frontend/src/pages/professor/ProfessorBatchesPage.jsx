import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Plus, Send, AlertCircle, PackageOpen } from 'lucide-react'
import { StatusBadge } from '../../components/StatusBadge.jsx'
import { Skeleton } from '../../components/SkeletonLoader.jsx'

const ProfessorBatchesPage = () => {
    const [batches, setBatches] = useState([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    // Create Batch States
    const [batchTitle, setBatchTitle] = useState('')
    const [batchSubject, setBatchSubject] = useState('')
    const [batchDescription, setBatchDescription] = useState('')
    const [activeBatchId, setActiveBatchId] = useState(null)
    const [isCreating, setIsCreating] = useState(false)

    // Add Question States
    const [title, setTitle] = useState('')
    const [options, setOptions] = useState(['', '', '', ''])
    const [correctAnswer, setCorrectAnswer] = useState('')
    const [difficultyLevel, setDifficultyLevel] = useState('easy')
    const [subject, setSubject] = useState('')
    const [topic, setTopic] = useState('')
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0)

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
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || "Server Error"))
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
            await axios.post(`http://localhost:4000/api/professor/batches/${activeBatchId}/questions`, {
                title, options, correctAnswer, difficultyLevel, subject, topic, correctAnswerIndex: Number(correctAnswerIndex)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setTitle(''); setOptions(['', '', '', '']); setCorrectAnswer(''); setCorrectAnswerIndex(0);
            setActiveBatchId(null);
            fetchMyBatches(token);
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || "Server Error"));
        }
    };

    const submitBatch = async (batchId) => {
        try {
            const token = localStorage.getItem('profToken');
            await axios.post(`http://localhost:4000/api/professor/batches/${batchId}/submit`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMyBatches(token);
        } catch (error) {
            alert("Error submitting batch");
        }
    };

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
                                <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'white' }} type="text" placeholder="e.g. Physics Midterm Pool" value={batchTitle} onChange={(e) => setBatchTitle(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Subject</label>
                                <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'white' }} type="text" placeholder="e.g. Physics" value={batchSubject} onChange={(e) => setBatchSubject(e.target.value)} required />
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Description (Optional)</label>
                                <textarea className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'white', minHeight: 80 }} placeholder="Brief description of the batch content" value={batchDescription} onChange={(e) => setBatchDescription(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: 16 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsCreating(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Batch</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {activeBatchId && (
                <div className="card" style={{ marginBottom: 24, border: '1px solid var(--brand-primary)' }}>
                    <div className="card-header" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="card-title">Add Question to Batch</h2>
                        <button className="btn btn-secondary btn-sm" onClick={() => setActiveBatchId(null)}>Close</button>
                    </div>
                    <div className="card-body" style={{ padding: '24px' }}>
                        <form onSubmit={handleAddQuestionToBatch} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Question Text</label>
                                <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'white' }} type="text" placeholder="e.g. What is React?" value={title} onChange={(e) => setTitle(e.target.value)} required />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Subject</label>
                                    <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'white' }} type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Topic</label>
                                    <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'white' }} type="text" placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} required />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Difficulty</label>
                                    <select className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'white' }} value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}>
                                        <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Options</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    {[0, 1, 2, 3].map(index => (
                                        <input key={index} className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'white' }} type="text" placeholder={`Option ${index + 1}`} value={options[index]} onChange={(e) => handleOptionChange(index, e.target.value)} required />
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Exact Correct Answer Text</label>
                                    <input className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'white' }} type="text" placeholder="Exact Correct Answer Text" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} required />
                                </div>
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Correct Option</label>
                                    <select className="form-input" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', padding: '8px 12px', borderRadius: 6, color: 'white' }} value={correctAnswerIndex} onChange={(e) => setCorrectAnswerIndex(e.target.value)}>
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
                                <StatusBadge status={batch.status} />
                            </div>

                            {batch.adminMessage && (
                                <div style={{ background: 'var(--danger-subtle)', borderLeft: '3px solid var(--danger)', padding: 12, marginBottom: 16, borderRadius: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
                                        <AlertCircle size={14} /> Admin Feedback
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>{batch.adminMessage}</p>
                                </div>
                            )}

                            {(batch.status === 'Draft' || batch.status === 'MarkForReview' || batch.status === 'Rejected') && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 24, borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setActiveBatchId(batch._id)}>
                                        <Plus size={14} style={{ marginRight: 4 }}/> Add Question
                                    </button>
                                    <button className="btn btn-primary btn-sm" onClick={() => submitBatch(batch._id)} disabled={!batch.questions || batch.questions.length === 0}>
                                        <Send size={14} style={{ marginRight: 4 }}/> Submit to Admin
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
