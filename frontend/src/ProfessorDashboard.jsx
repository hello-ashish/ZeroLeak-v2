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

    useEffect(() => {
        const token = localStorage.getItem('profToken');
        const profDataString = localStorage.getItem('profData');

        if (!token || !profDataString) {
            navigate('/professor/login');
        } else {
            const profData = JSON.parse(profDataString);
            setProfName(profData.name);
        }
    }, [navigate]);

    const handleOptionChange = (idx, value) => {
        const newOptions = [...options];
        newOptions[idx] = value;
        setOptions(newOptions);
    };

    const handleCreateQuestion = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('profToken');

            await axios.post("http://localhost:4000/api/questions", {
                title,
                options,
                correctAnswer,
                difficultyLevel,
                subject,
                topic,
                correctAnswerIndex: Number(correctAnswerIndex)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Question created successfully");

            // reset the form
            setTitle('');
            setOptions(['', '', '', '']);
            setCorrectAnswer('');
            setSubject('');
            setTopic('');
            setCorrectAnswerIndex(0);

        } catch (error) {
            alert("Error: " + (error.response?.data?.message || "Server Error"));
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/professor/login');
    };

    return (
        <div className="glass-container" style={{ maxWidth: '900px', marginTop: '2rem', marginBottom: '2rem' }}>
            <h1 className="glass-title">Professor Dashboard</h1>
            <p className="glass-subtitle">Welcome back, Professor {profName}</p>
            <button onClick={handleLogout} className="glass-button" style={{ background: 'var(--danger)', marginBottom: '2rem' }}>Logout</button>
            
            {/* --- QUESTION CREATION SECTION --- */}
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <h2 style={{ color: 'white', marginBottom: '1rem' }}>Create New Questions</h2>
                <form onSubmit={handleCreateQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                    <button type="submit" className="glass-button">Save Question to Database</button>
                </form>
            </div>
        </div>
    );
};
export default ProfessorDashboard;
