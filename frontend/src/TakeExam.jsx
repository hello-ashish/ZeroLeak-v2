import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const TakeExam = () => {
  // 1. URL Parameters! We grab the ID from the route.
  const { id } = useParams(); 
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  // This state object stores the selected option index for each question ID
  // e.g., { "64abcd...": 2, "64efgh...": 0 }
  const [answers, setAnswers] = useState({}); 
  const [score, setScore] = useState(null);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        const token = localStorage.getItem('studentToken');
        if (!token) return navigate('/student/login');

        const response = await axios.get(`http://localhost:4000/api/students/exams/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setExam(response.data.exam);
      } catch (error) {
        console.error("Failed to fetch exam", error);
        alert("Failed to load exam. Please try again.");
      }
    };

    fetchExam();
  }, [id, navigate]);

  const handleOptionSelect = (questionId, optionIndex) => {
    // If they already submitted and have a score, they can't change their answers!
    if (score !== null) return; 

    // Update our dictionary of answers
    setAnswers({
      ...answers,
      [questionId]: optionIndex
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation: Check if they answered every question
    if (Object.keys(answers).length < exam.questions.length) {
      const confirmSubmit = window.confirm("You haven't answered all questions. Are you sure you want to submit?");
      if (!confirmSubmit) return;
    }

    // GRADE THE EXAM!
    let totalScore = 0;
    exam.questions.forEach((q) => {
      // If the answer they selected matches the correct index, add a point!
      if (answers[q._id] === q.correctAnswerIndex) {
        totalScore += 1;
      }
    });

    // Save the final score to state to trigger the UI update!
    setScore(totalScore);

    try {
      const token = localStorage.getItem('studentToken');
      await axios.post('http://localhost:4000/api/students/results', {
        examId: exam._id,
        score: totalScore,
        totalQuestions: exam.questions.length
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Exam result submitted successfully!");
    } catch (error) {
      console.error("Failed to submit exam result", error);
      alert("Failed to submit exam result. Please try again.");
    }
  };

  if (!exam) return <div className="glass-container"><h2 style={{color: 'white', textAlign: 'center'}}>Loading Exam...</h2></div>;

  return (
    <div className="glass-container" style={{ maxWidth: '800px', marginTop: '2rem', marginBottom: '2rem' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 className="glass-title">{exam.title}</h1>
          <p className="glass-subtitle">Professor: {exam.createdBy.name} | Duration: {exam.durationMinutes} mins</p>
        </div>
        <button className="glass-button" style={{width: 'auto', background: 'rgba(255,255,255,0.2)'}} onClick={() => navigate('/student/dashboard')}>
          Back to Dashboard
        </button>
      </div>

      {/* RESULT BANNER (Only shows after submitting!) */}
      {score !== null && (
        <div style={{ background: 'var(--success)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', color: 'white', marginBottom: '2rem' }}>
          <h2>Exam Complete!</h2>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Your Score: {score} / {exam.questions.length}</p>
          <p style={{ fontSize: '1.1rem' }}>({Math.round((score / exam.questions.length) * 100)}%)</p>
        </div>
      )}

      {/* QUESTIONS SECTION */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {exam.questions.map((q, index) => (
            <div key={q._id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1.5rem', borderRadius: '8px', color: 'white' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>
                {index + 1}. {q.title}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {q.options.map((opt, optIndex) => {
                  
                  // Check if this specific option is the one the student selected
                  const isSelected = answers[q._id] === optIndex;
                  
                  // DYNAMIC COLOR CODING
                  let bgColor = 'rgba(0,0,0,0.3)';
                  
                  if (score !== null) { // If the exam is submitted...
                    if (optIndex === q.correctAnswerIndex) {
                        bgColor = 'var(--success)'; // Correct answer is always green
                    } else if (isSelected) {
                        bgColor = 'var(--danger)'; // Their wrong answer is red
                    }
                  } else if (isSelected) { // Before submitting...
                    bgColor = 'var(--accent-primary)'; // Just highlight what they clicked in blue
                  }

                  return (
                    <div 
                      key={optIndex} 
                      onClick={() => handleOptionSelect(q._id, optIndex)}
                      style={{ 
                        background: bgColor, 
                        padding: '10px 15px', 
                        borderRadius: '6px', 
                        cursor: score === null ? 'pointer' : 'default', // Remove pointer finger after submitting
                        transition: 'background 0.2s',
                        border: isSelected ? '1px solid white' : '1px solid transparent'
                      }}
                    >
                      {opt}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {score === null && (
          <button type="submit" className="glass-button" style={{ background: 'var(--success)', marginTop: '2rem' }}>
            Submit Exam
          </button>
        )}
      </form>
    </div>
  );
};

export default TakeExam;
