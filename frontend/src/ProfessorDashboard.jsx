import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"

const ProfessorDashboard = () => {
    const [profName, setProfName] = useState('')
    const [title, setTitle] = useState('')
    const [options, setOptions] = useState(['', '', '', ''])
    const [correctAnswer, setCorrectAnswer] = useState('')
    const [difficultyLevel, setDifficultyLevel] = useState('easy')
    const [subject, setSubject] = useState('')
    const [topic, setTopic] = useState('')
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0)
    const [questions, setQuestions] = useState([])

    const navigate = useNavigate()

    const fetchQuestions = async () => {
        try {
            const token = localStorage.getItem('profToken')
            const response = await axios.get('http://localhost:4000/api/questions', {
                headers: { Authorization: `Bearer ${token}` }
            })

            setQuestions(response.data.questions)
        } catch(error) {
            console.error("Failed to fetch questions", error)
        }
    }

    useEffect(() => {
        const token = localStorage.getItem('profToken')
        const profDataString = localStorage.getItem('profData')

        if(!token || !profDataString) {
            navigate('/professor/login')
        } else {
            const profData = JSON.parse(profDataString)
            setProfName(profData.name)

            fetchQuestions()
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
                headers: { Authorization: `Bearer ${token}`}
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

    const handleLogout = () => {
        localStorage.clear()
        navigate('/professor/login')
    }

    return (
    // The main container
    <div className="glass-container" style={{ maxWidth: '800px', marginTop: '2rem', marginBottom: '2rem' }}>
      <h1 className="glass-title">Professor Dashboard</h1>
      <p className="glass-subtitle" style={{marginBottom: '1rem'}}>Welcome back, Professor {profName}</p>
      <button onClick={handleLogout} className="glass-button" style={{ background: 'var(--danger)', marginBottom: '2rem' }}>
        Logout
      </button>
      <h2 style={{color: 'white', marginBottom: '1rem'}}>Create Exam Question</h2>
      
      {/* The Question Form */}
      <form onSubmit={handleCreateQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input className="glass-input" type="text" placeholder="Question Title (e.g. What is React?)" value={title} onChange={(e) => setTitle(e.target.value)} required />
        
        <div style={{display: 'flex', gap: '10px'}}>
          <input className="glass-input" type="text" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          <input className="glass-input" type="text" placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} required />
          <select className="glass-input" value={difficultyLevel} onChange={(e) => setDifficultyLevel(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        {/* Render 4 input boxes for the 4 options */}
        <h4 style={{color: 'white', marginTop: '1rem'}}>Options:</h4>
        {/* We map over an array of 4 numbers to render 4 identical inputs! */}
        {[0, 1, 2, 3].map(index => (
            <input 
              key={index}
              className="glass-input" 
              type="text" 
              placeholder={`Option ${index + 1}`} 
              value={options[index]} 
              onChange={(e) => handleOptionChange(index, e.target.value)} 
              required 
            />
        ))}
        <h4 style={{color: 'white', marginTop: '1rem'}}>Correct Answer Info:</h4>
        <input className="glass-input" type="text" placeholder="Exact Correct Answer Text" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} required />
        
        <select className="glass-input" value={correctAnswerIndex} onChange={(e) => setCorrectAnswerIndex(e.target.value)}>
          <option value={0}>Option 1 is correct</option>
          <option value={1}>Option 2 is correct</option>
          <option value={2}>Option 3 is correct</option>
          <option value={3}>Option 4 is correct</option>
        </select>
        <button type="submit" className="glass-button" style={{marginTop: '1rem'}}>Save Question to Database</button>
      </form>

      <h2 style={{color: 'white', marginBottom: '1rem', marginTop: '2rem'}}>Your Questions</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* We use .map() to loop over our questions array and create a visual card for each one! */}
        {questions.map((q) => (
          <div key={q._id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', color: 'white' }}>
            <h3 style={{color: 'var(--accent-primary)', marginBottom: '0.5rem'}}>{q.title}</h3>
            <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem'}}>
              Subject: {q.subject} | Topic: {q.topic} | Difficulty: {q.difficultyLevel}
            </p>
            
            {/* We can even map over the options array inside the question! */}
            <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
              {q.options.map((opt, index) => (
                <span key={index} style={{ 
                  // If this option is the correct answer, color it green! Otherwise, dark grey.
                  background: index === q.correctAnswerIndex ? 'var(--success)' : 'rgba(0,0,0,0.3)', 
                  padding: '5px 10px', 
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}>
                  {opt}
                </span>
              ))}
            </div>
          </div>
        ))}
        
        {/* If the array is empty, show a fallback message */}
        {questions.length === 0 && <p style={{color: 'gray'}}>You haven't created any questions yet.</p>}
      </div>
    </div>
  );
};

export default ProfessorDashboard