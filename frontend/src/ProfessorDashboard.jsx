import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ProfessorDashboard = () => {
    const [profName, setProfName] = useState('');
    const navigate = useNavigate();

    // Question States
    const [title, setTitle] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [difficultyLevel, setDifficultyLevel] = useState('easy');
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);

    // --- NEW BATCH STATES ---
    const [batches, setBatches] = useState([]);
    const [batchTitle, setBatchTitle] = useState('');
    const [batchSubject, setBatchSubject] = useState('');
    const [batchDescription, setBatchDescription] = useState('');
    const [activeBatchId, setActiveBatchId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('profToken');
        const profDataString = localStorage.getItem('profData');

        if (!token || !profDataString) {
            navigate('/professor/login')
        } else {
            const profData = JSON.parse(profDataString)
            setProfName(profData.name)
            fetchMyBatches();
        }
    }, [navigate]);

    const handleOptionChange = (idx, value) => {
        const newOptions = [...options];
        newOptions[idx] = value;
        setOptions(newOptions);
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/professor/login');
    };

    // helper function for batch color
    const getBatchColor = (batch) => {
        if (batch.status === 'Rejected') return 'rgba(239, 68, 68, 0.2)'
        if (batch.openedByAdmin && batch.status === 'Submitted') return 'rgba(234, 179, 8, 0.2)'
        if (batch.status === 'Submitted' || batch.status === 'Accepted') return 'rgba(16, 185, 129, 0.2)'
        return 'rgba(255, 255, 255, 0.1)'
    }

    const fetchMyBatches = async () => {
        try {
            const token = localStorage.getItem('profToken')
            const response = await axios.get('http://localhost:4000/api/professor/batches', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setBatches(response.data.batches)
        } catch (error) {
            console.error("Error fetching batches: ", error)
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
            alert("Batch created successfully")
            setBatchTitle('')
            setBatchSubject('')
            setBatchDescription('')
            fetchMyBatches()
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || "Server Error"))
        }
    }

    const handleAddQuestionToBatch = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('profToken');
            await axios.post(`http://localhost:4000/api/professor/batches/${activeBatchId}/questions`, {
                title, options, correctAnswer, difficultyLevel, subject, topic, correctAnswerIndex: Number(correctAnswerIndex)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("Question successfully added to the batch!");
            setTitle(''); setOptions(['', '', '', '']); setCorrectAnswer(''); setCorrectAnswerIndex(0);
            setActiveBatchId(null); // Hide form
            fetchMyBatches();
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
            alert("Batch submitted to admin for review!");
            fetchMyBatches();
        } catch (error) {
            alert("Error submitting batch");
        }
    };

    return (
        <div className="glass-container" style={{ maxWidth: '900px', marginTop: '2rem', marginBottom: '2rem' }}>
            <h1 className="glass-title">Professor Dashboard</h1>
            <p className="glass-subtitle">Welcome back, Professor {profName}</p>
            <button onClick={() => navigate('/professor/profile')} className="glass-button" style={{ background: 'var(--accent-primary)' }}>
                Edit Profile
            </button>
            <button onClick={handleLogout} className="glass-button" style={{ background: 'var(--danger)', marginBottom: '2rem' }}>Logout</button>

            {/* --- CREATE NEW BATCH SECTION --- */}
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '2rem' }}>
                <h2 style={{ color: 'white', marginBottom: '1rem' }}>1. Create a Question Batch</h2>
                <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input className="glass-input" type="text" placeholder="Batch Title (e.g. Physics Midterm Pool)" value={batchTitle} onChange={(e) => setBatchTitle(e.target.value)} required />
                    <input className="glass-input" type="text" placeholder="Subject (e.g. Physics)" value={batchSubject} onChange={(e) => setBatchSubject(e.target.value)} required />
                    <textarea className="glass-input" placeholder="Optional Description" value={batchDescription} onChange={(e) => setBatchDescription(e.target.value)} />
                    <button type="submit" className="glass-button" style={{ background: 'var(--success)' }}>Create Batch</button>
                </form>
            </div>

            {/* --- ADD QUESTION TO BATCH FORM (Only visible when Add Question is clicked) --- */}
            {activeBatchId && (
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ color: 'white' }}>Add Question to Batch</h2>
                        <button onClick={() => setActiveBatchId(null)} className="glass-button" style={{ width: 'auto', background: 'rgba(255,255,255,0.2)' }}>Cancel</button>
                    </div>

                    <form onSubmit={handleAddQuestionToBatch} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input className="glass-input" type="text" placeholder="Question Title (e.g. What is React?)" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input className="glass-input" type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                            <input className="glass-input" type="text" placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} required />
                            <select className="glass-input" value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}>
                                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[0, 1, 2, 3].map(index => (
                                <input key={index} className="glass-input" type="text" placeholder={`Option ${index + 1}`} value={options[index]} onChange={(e) => handleOptionChange(index, e.target.value)} required />
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input className="glass-input" type="text" placeholder="Exact Correct Answer Text" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} required />
                            <select className="glass-input" value={correctAnswerIndex} onChange={(e) => setCorrectAnswerIndex(e.target.value)}>
                                <option value={0}>Option 1 is correct</option><option value={1}>Option 2 is correct</option><option value={2}>Option 3 is correct</option><option value={3}>Option 4 is correct</option>
                            </select>
                        </div>
                        <button type="submit" className="glass-button">Save Question to Batch</button>
                    </form>
                </div>
            )}

            {/* --- MY BATCHES LIST --- */}
            <h2 style={{ color: 'white', marginBottom: '1rem' }}>2. My Batches</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {batches.map((batch) => (
                    <div key={batch._id} style={{ background: getBatchColor(batch), padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h3 style={{ color: 'white', fontSize: '1.2rem' }}>{batch.title}</h3>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '0.8rem' }}>
                                {batch.status}
                            </span>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '10px' }}>Subject: {batch.subject} | Questions inside: {batch.questions?.length || 0}</p>

                        {batch.adminMessage && (
                            <p style={{ color: 'var(--accent-primary)', marginBottom: '10px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                                <strong>Admin Note:</strong> {batch.adminMessage}
                            </p>
                        )}

                        {/* If Draft, show buttons to Add Questions and Submit */}
                        {(batch.status === 'Draft' || batch.status === 'MarkForReview') && (
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button className="glass-button" onClick={() => setActiveBatchId(batch._id)}>+ Add Question</button>
                                <button className="glass-button" style={{ background: 'var(--success)' }} onClick={() => submitBatch(batch._id)}>Submit Batch to Admin</button>
                            </div>
                        )}
                    </div>
                ))}
                {batches.length === 0 && <p style={{ color: 'gray' }}>You haven't created any batches yet.</p>}
            </div>
        </div>
    )
}

export default ProfessorDashboard