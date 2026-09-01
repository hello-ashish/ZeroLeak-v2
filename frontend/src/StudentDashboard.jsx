import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const StudentDashboard = () => {
  const [studentName, setStudentName] = useState('');
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('studentToken');
    const studentDataString = localStorage.getItem('studentData');

    if (!token || !studentDataString) {
      navigate('/student/login');
    } else {
      const studentData = JSON.parse(studentDataString);
      setStudentName(studentData.name);
      
      // Fetch the available exams as soon as the student logs in
      fetchExams(token);
    }
  }, [navigate]);

  const fetchExams = async (token) => {
    try {
      const response = await axios.get('http://localhost:4000/api/students/exams', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExams(response.data.exams);
    } catch (error) {
      console.error("Failed to fetch exams", error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="glass-container" style={{ maxWidth: '1000px', marginTop: '1rem', marginBottom: '1rem' }}>
      <h1 className="glass-title" style={{color: 'var(--success)'}}>Student Portal</h1>
      <p className="glass-subtitle" style={{marginBottom: '1rem'}}>Welcome, {studentName}!</p>
      
      <button onClick={handleLogout} className="glass-button" style={{ background: 'var(--danger)', marginBottom: '2rem' }}>
        Logout
      </button>

      <h2 style={{color: 'white', marginBottom: '1rem'}}>Available Exams</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {exams.map((exam) => (
          <div key={exam._id} style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
            <h3 style={{color: 'var(--success)', marginBottom: '0.5rem'}}>{exam.title}</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: '1rem'}}>{exam.description}</p>
            
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span style={{fontSize: '0.9rem'}}>
                {/* We can access .name because we used .populate("createdBy") in the backend! */}
                <strong>Professor:</strong> {exam.createdBy?.name || "Unknown"} | <strong>Duration:</strong> {exam.durationMinutes} mins
              </span>
              
               <button 
                className="glass-button" 
                style={{width: 'auto', background: 'var(--success)'}} 
                onClick={() => navigate(`/student/take-exam/${exam._id}`)}
              >
                Start Exam
              </button>
            </div>
          </div>
        ))}

        {exams.length === 0 && <p style={{color: 'gray'}}>There are no exams available right now.</p>}
      </div>
    </div>
  );
};

export default StudentDashboard;