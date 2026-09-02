import React, { useEffect, useState} from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const AdminDashboard = () => {
    const [adminEmail, setAdminEmail] = useState("")

    // Professor
    const [profId, setProfId] = useState('');
    const [profName, setProfName] = useState('');
    const [profEmail, setProfEmail] = useState('');
    const [profPassword, setProfPassword] = useState('');
    const [showProfPassword, setShowProfPassword] = useState(false)
    const [professors, setProfessors] = useState([])

    // Student
    const [studentId, setStudentId] = useState('')
    const [studentName, setStudentName] = useState('')
    const [studentEmail, setStudentEmail] = useState('')
    const [studentPassword, setStudentPassword] = useState('')
    const [showStudentPassword, setShowStudentPassword] = useState(false)
    const [students, setStudents] = useState([])

    // Exam states
    const [examTitle, setExamTitle] = useState('')
    const [examDescription, setExamDescription] = useState('')
    const [examDuration, setExamDuration] = useState(60)
    const [selectedQuestions, setSelectedQuestions] = useState([])
    const [exams, setExams] = useState([])
    const [questions, setQuestions] = useState([])
    const [studentResults, setStudentResults] = useState([]);

    const navigate = useNavigate()

    // Fetchers
    const fetchProfessors = async (token) => {
        try {
            const response = await axios.get('http://localhost:4000/api/admin/professors', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setProfessors(response.data.professors)
        } catch (error) {
            console.error("Failed to fetch professors", error)
        }
    }

    const fetchStudents = async (token) => {
        try {
            const response = await axios.get('http://localhost:4000/api/students', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudents(response.data.students);
        } catch (error) {
            console.error("Failed to fetch students", error);
        }
    }

    const fetchQuestions = async (token) => {
        try {
            const response = await axios.get('http://localhost:4000/api/questions', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setQuestions(response.data.questions)
        } catch (error) {
            console.error("Failed to fetch questions", error)
        }
    }

    const fetchExams = async (token) => {
        try {
            const response = await axios.get('http://localhost:4000/api/exams', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setExams(response.data.exams)
        } catch (error) {
            console.error("Failed to fetch exams", error)
        }
    }

    const fetchStudentResults = async (token) => {
        try {
            const response = await axios.get('http://localhost:4000/api/exams/results', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setStudentResults(response.data.results)
        } catch (error) {
            console.error("Failed to fetch student results", error)
        }
    }

    useEffect(() => {
        const token = localStorage.getItem('adminToken')
        const adminDataString = localStorage.getItem('adminData')

        if(!token || !adminDataString) {
            alert('You must be logged in to view this page')
            navigate('/')
        } else {
            const adminData = JSON.parse(adminDataString)
            setAdminEmail(adminData.email)

            fetchProfessors(token)
            fetchStudents(token)
            fetchQuestions(token)
            fetchExams(token)
            fetchStudentResults(token)
        }
    }, [navigate])

    const handleCreateProfessor = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('adminToken')
            await axios.post('http://localhost:4000/api/admin/professors', {
                id: profId,
                name: profName,
                email: profEmail,
                password: profPassword
            }, {headers: { Authorization: `Bearer ${token}` }})

            alert('Professors created successfully')
            setProfId(''); setProfName(''); setProfEmail(''); setProfPassword('');
            fetchProfessors(token);
        } catch (error) {
            alert("Error creating professor: " + (error.response?.data?.message || "Server Error"));
        }
    }

    const handleCreateStudent = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('adminToken')
            await axios.post('http://localhost:4000/api/students/register', {
                studentId: studentId,
                name: studentName,
                email: studentEmail,
                password: studentPassword
            }, {headers: { Authorization: `Bearer ${token}` }})

            alert('Student created successfully')
            setStudentId(''); setStudentName(''); setStudentEmail(''); setStudentPassword('');
            fetchStudents(token);
        } catch (error) {
            alert("Error creating student: " + (error.response?.data?.message || "Server Error"));
        }
    }

    const handleCreateExam = async (e) => {
        e.preventDefault()
        if (selectedQuestions.length === 0) {
            alert("Please select at least one question for the exam.")
            return
        }

        try {
            const token = localStorage.getItem('adminToken')
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
            fetchExams(token)
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

    const handleLogout = () => {
        localStorage.clear()
        navigate('/')
    }

    return (
    <div className="glass-container" style={{ maxWidth: '900px', marginTop: '2rem', marginBottom: '2rem' }}>
      <h1 className="glass-title">Admin Dashboard</h1>
      <p className="glass-subtitle">Welcome back, {adminEmail}</p>
      <button onClick={handleLogout} className="glass-button" style={{ background: 'var(--danger)', marginBottom: '2rem' }}>Logout</button>
      
      {/* --- PROFESSOR MANAGEMENT SECTION --- */}
      <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
        <h2 style={{color: 'white', marginBottom: '1rem'}}>Manage Professors</h2>
        <form onSubmit={handleCreateProfessor} style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input className="glass-input" style={{flex: 1}} type="text" placeholder="ID (PROF-01)" value={profId} onChange={(e) => setProfId(e.target.value)} required />
          <input className="glass-input" style={{flex: 1}} type="text" placeholder="Name" value={profName} onChange={(e) => setProfName(e.target.value)} required />
          <input className="glass-input" style={{flex: 1}} type="email" placeholder="Email" value={profEmail} onChange={(e) => setProfEmail(e.target.value)} required />
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <input className="glass-input" style={{ width: '100%', paddingRight: '2.5rem' }} type={showProfPassword ? 'text' : 'password'} placeholder="Password" value={profPassword} onChange={(e) => setProfPassword(e.target.value)} required />
            <button type="button" onClick={() => setShowProfPassword(!showProfPassword)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
              {showProfPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <button type="submit" className="glass-button" style={{ width: 'auto' }}>Create</button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {professors.map((prof) => (
            <div key={prof._id} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '8px', color: 'white' }}>
              <p><strong>Name:</strong> {prof.name} | <strong>ID:</strong> {prof.id} | <strong>Email:</strong> {prof.email}</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- STUDENT MANAGEMENT SECTION --- */}
      <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '2rem' }}>
        <h2 style={{color: 'white', marginBottom: '1rem'}}>Manage Students</h2>
        <form onSubmit={handleCreateStudent} style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input className="glass-input" style={{flex: 1}} type="text" placeholder="ID (STU-01)" value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
          <input className="glass-input" style={{flex: 1}} type="text" placeholder="Name" value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
          <input className="glass-input" style={{flex: 1}} type="email" placeholder="Email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} required />
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <input className="glass-input" style={{ width: '100%', paddingRight: '2.5rem' }} type={showStudentPassword ? 'text' : 'password'} placeholder="Password" value={studentPassword} onChange={(e) => setStudentPassword(e.target.value)} required />
            <button type="button" onClick={() => setShowStudentPassword(!showStudentPassword)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
              {showStudentPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <button type="submit" className="glass-button" style={{ width: 'auto', background: 'var(--success)' }}>Create</button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {students.map((student) => (
            <div key={student._id} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '8px', color: 'white' }}>
              <p><strong>Name:</strong> {student.name} | <strong>ID:</strong> {student.studentId} | <strong>Email:</strong> {student.email}</p>
            </div>
          ))}
          {students.length === 0 && <p style={{color: 'gray'}}>No students registered yet.</p>}
        </div>
      </div>

      {/* --- EXAM MANAGEMENT SECTION --- */}
      <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.3)', marginBottom: '2rem' }}>
        <h2 style={{ color: 'white', marginBottom: '1rem' }}>Build an Exam</h2>
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

      {/* --- QUESTION BANK SECTION --- */}
      <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.3)', marginBottom: '2rem' }}>
        <h2 style={{ color: 'white', marginBottom: '1rem' }}>Question Bank (Select to add to Exam)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {questions.map((q) => (
                <div key={q._id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', color: 'white', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                    <input type="checkbox" style={{ marginTop: '5px', transform: 'scale(1.5)', cursor: 'pointer' }} checked={selectedQuestions.includes(q._id)} onChange={() => handleCheckboxChange(q._id)} />
                    <div>
                        <h3 style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>{q.title}</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            Subject: {q.subject} | Difficulty: {q.difficultyLevel}
                        </p>
                    </div>
                </div>
            ))}
            {questions.length === 0 && <p style={{color: 'gray'}}>No questions available.</p>}
        </div>
      </div>

      {/* --- PUBLISHED EXAMS SECTION --- */}
      <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', marginBottom: '2rem' }}>
        <h2 style={{ color: 'white', marginBottom: '1rem' }}>Published Exams</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {exams.map((exam) => (
                <div key={exam._id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', color: 'white' }}>
                    <h3 style={{ color: 'var(--success)' }}>{exam.title}</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>{exam.description}</p>
                    <p style={{ fontSize: '0.9rem' }}><strong>Duration:</strong> {exam.durationMinutes} mins | <strong>Questions:</strong> {exam.questions.length}</p>
                </div>
            ))}
            {exams.length === 0 && <p style={{color: 'gray'}}>No exams published yet.</p>}
        </div>
      </div>

      {/* --- STUDENT PERFORMANCE SECTION --- */}
      <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <h2 style={{color: 'white', marginBottom: '1rem'}}>Student Performance (Gradebook)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {studentResults.map((result) => (
            <div key={result._id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', color: 'white' }}>
                <h3 style={{color: 'var(--danger)', marginBottom: '0.5rem'}}>
                    {result.student?.name} ({result.student?.studentId})
                </h3>
                <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Exam: {result.exam?.title}</p>
                <p style={{fontSize: '1.1rem', fontWeight: 'bold', marginTop: '0.5rem'}}>
                Score: {result.score} / {result.totalQuestions} ({Math.round((result.score / result.totalQuestions) * 100)}%)
                </p>
            </div>
            ))}
            {studentResults.length === 0 && <p style={{color: 'gray'}}>No students have taken any exams yet.</p>}
        </div>
      </div>
    </div>
  );
};
export default AdminDashboard;