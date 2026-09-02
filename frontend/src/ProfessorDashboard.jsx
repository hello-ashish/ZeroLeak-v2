import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"

const ProfessorDashboard = () => {
    const [profName, setProfName] = useState('')
    const navigate = useNavigate()

    // Question States
    const [title, setTitle] = useState('')
    const [options, setOptions] = useState(['', '', '', ''])
    const [correctAnswer, setCorrectAnswer] = useState('')
    const [difficultyLevel, setDifficultyLevel] = useState('easy')
    const [subject, setSubject] = useState('')
    const [topic, setTopic] = useState('')
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0)
    const [questions, setQuestions] = useState([])

    // Exam states
    const [examTitle, setExamTitle] = useState('')
    const [examDescription, setExamDescription] = useState('')
    const [examDuration, setExamDuration] = useState(60)
    const [selectedQuestions, setSelectedQuestions] = useState([])
    const [exams, setExams] = useState([])

    // Student Results State
    const [studentResults, setStudentResults] = useState([]);

    // Fetching Data
    const fetchQuestions = async () => {
        try {
            const token = localStorage.getItem('profToken')
            const response = await axios.get('http://localhost:4000/api/questions', {
                headers: { Authorization: `Bearer ${token}` }
            })

            setQuestions(response.data.questions)
        } catch (error) {
            console.error("Failed to fetch questions", error)
        }
    }

    const fetchExams = async () => {
        try {
            const token = localStorage.getItem('profToken')
            const response = await axios.get('http://localhost:4000/api/exams', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setExams(response.data.exams)
        } catch (error) {
            console.error("Failed to fetch exams", error)
        }
    }

    const fetchStudentResults = async () => {
        try {
            const token = localStorage.getItem('profToken')
            const response = await axios.get('http://localhost:4000/api/exams/results', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setStudentResults(response.data.results)
        } catch (error) {
            console.error("Failed to fetch student results", error)
        }
    }
    useEffect(() => {
        const token = localStorage.getItem('profToken')
        const profDataString = localStorage.getItem('profData')

        if (!token || !profDataString) {
            navigate('/professor/login')
        } else {
            const profData = JSON.parse(profDataString)
            setProfName(profData.name)

            fetchQuestions()
            fetchExams()
            fetchStudentResults()
        }
    }, [navigate])

    const handleOptionChange = (idx, value) => {
        const newOptions = [...options]
        newOptions[idx] = value
        setOptions(newOptions)
    }

    const handleCreateQuestion = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('profToken')

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
            })
            alert("Question created succesfully")

            // reset the form
            setTitle('')
            setOptions(['', '', '', ''])
            setCorrectAnswer('')
            setSubject('')
            setTopic('')
            setCorrectAnswerIndex(0)

            fetchQuestions()
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || "Server Error"))
        }
    }

    const handleCheckboxChange = (questionId) => {
        if (selectedQuestions.includes(questionId)) {
            setSelectedQuestions(selectedQuestions.filter(id => id !== questionId))
        } else {
            setSelectedQuestions([...selectedQuestions, questionId])
        }
    }

    const handleCreateExam = async (e) => {
        e.preventDefault()
        if (selectedQuestions.length === 0) {
            alert("Please select at least one question for the exam.")
            return
        }

        try {
            const token = localStorage.getItem('profToken')

            await axios.post("http://localhost:4000/api/exams", {
                title: examTitle,
                description: examDescription,
                duration: examDuration,
                questions: selectedQuestions
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            alert("Exam created successfully")

            setExamTitle('')
            setExamDescription('')
            setExamDuration(60)
            setSelectedQuestions([])

            fetchExams()
        } catch (error) {
            alert("Error: " + (error.response?.data?.message || "Server Error"))
        }
    }

    const handleLogout = () => {
        localStorage.clear()
        navigate('/professor/login')
    }

    return (
        <div className="glass-container" style={{ maxWidth: '900px', marginTop: '2rem', marginBottom: '2rem' }}>
            <h1 className="glass-title">Professor Dashboard</h1>
            <p className="glass-subtitle">Welcome back, Professor {profName}</p>
            <button onClick={handleLogout} className="glass-button" style={{ background: 'var(--danger)', marginBottom: '2rem' }}>Logout</button>
            {/* --- EXAM CREATION SECTION --- */}
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                <h2 style={{ color: 'white', marginBottom: '1rem' }}>1. Build an Exam</h2>
                <form onSubmit={handleCreateExam} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input className="glass-input" type="text" placeholder="Exam Title (e.g. Midterm 1)" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} required />
                    <textarea className="glass-input" placeholder="Exam Description" value={examDescription} onChange={(e) => setExamDescription(e.target.value)} required style={{ minHeight: '80px' }} />
                    <div>
                        <label style={{ color: 'white', marginRight: '10px' }}>Duration (Minutes):</label>
                        <input className="glass-input" type="number" style={{ width: '100px' }} value={examDuration} onChange={(e) => setExamDuration(e.target.value)} required />
                    </div>
                    <button type="submit" className="glass-button" style={{ background: 'var(--success)' }}>
                        Publish Exam ({selectedQuestions.length} Questions Selected)
                    </button>
                </form>
            </div>
            {/* --- QUESTION CREATION SECTION --- */}
            <h2 style={{ color: 'white', marginBottom: '1rem' }}>2. Create New Questions</h2>
            <form onSubmit={handleCreateQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '2rem' }}>
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
            {/* --- DISPLAY QUESTIONS (WITH CHECKBOXES) --- */}
            <h2 style={{ color: 'white', marginBottom: '1rem' }}>3. Question Bank (Select to add to Exam)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
                {questions.map((q) => (
                    <div key={q._id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', color: 'white', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>

                        {/* THE NEW CHECKBOX! */}
                        <input
                            type="checkbox"
                            style={{ marginTop: '5px', transform: 'scale(1.5)', cursor: 'pointer' }}
                            checked={selectedQuestions.includes(q._id)}
                            onChange={() => handleCheckboxChange(q._id)}
                        />

                        <div>
                            <h3 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>{q.title}</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                Subject: {q.subject} | Difficulty: {q.difficultyLevel}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            {/* --- DISPLAY EXAMS --- */}
            <h2 style={{ color: 'white', marginBottom: '1rem' }}>4. Published Exams</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {exams.map((exam) => (
                    <div key={exam._id} style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1rem', borderRadius: '8px', color: 'white' }}>
                        <h3 style={{ color: 'var(--success)' }}>{exam.title}</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>{exam.description}</p>
                        <p style={{ fontSize: '0.9rem' }}><strong>Duration:</strong> {exam.durationMinutes} mins | <strong>Questions:</strong> {exam.questions.length}</p>
                    </div>
                ))}
            </div>
             <h2 style={{color: 'white', marginBottom: '1rem', marginTop: '3rem'}}>5. Student Performance (Gradebook)</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {studentResults.map((result) => (
          <div key={result._id} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '8px', color: 'white' }}>
            {/* Because we used .populate(), we have access to the student's name and ID! */}
            <h3 style={{color: 'var(--danger)', marginBottom: '0.5rem'}}>
                {result.student?.name} ({result.student?.studentId})
            </h3>
            
            <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Exam: {result.exam?.title}</p>
            
            <p style={{fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.5rem'}}>
              Score: {result.score} / {result.totalQuestions} ({Math.round((result.score / result.totalQuestions) * 100)}%)
            </p>
          </div>
        ))}
        {studentResults.length === 0 && <p style={{color: 'gray'}}>No students have taken your exams yet.</p>}
      </div>
        </div>
    );
};
export default ProfessorDashboard;
