import React, { useEffect, useState} from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const AdminDashboard = () => {
    const [adminEmail, setAdminEmail] = useState("")
    const [profId, setProfId] = useState('');
    const [profName, setProfName] = useState('');
    const [profEmail, setProfEmail] = useState('');
    const [profPassword, setProfPassword] = useState('');

    const [professors, setProfessors] = useState([])

    const navigate = useNavigate()

    // helper function to fetch professors from backend
    const fetchProfessors = async () => {
        try {
            const token = localStorage.getItem('adminToken')

            const response = await axios.get('http://localhost:4000/api/admin/professors', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            setProfessors(response.data.professors)
        } catch (error) {
            console.error("Failed to fetch professors", error)
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

            fetchProfessors()
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
            }, {headers: {
                Authorization: `Bearer ${token}`
            }
        })

        alert('Professors created successfully')
        setProfId(''); setProfName(''); setProfEmail(''); setProfPassword('');

        fetchProfessors();
        } catch (error) {
             alert("Error creating professor: " + (error.response?.data?.message || "Server Error"));
        }
    }

    const handleLogout = () => {
        localStorage.clear()
        navigate('/')
    }

    return (
    <div className="glass-container" style={{ maxWidth: '800px' }}>
      <h1 className="glass-title">Admin Dashboard</h1>
      <p className="glass-subtitle" style={{marginBottom: '1rem'}}>Welcome back, {adminEmail}</p>
      <button onClick={handleLogout} className="glass-button" style={{ background: 'var(--danger)', marginBottom: '2rem' }}>
        Logout
      </button>
      {/* THE CREATE PROFESSOR FORM */}
      <h2 style={{color: 'white', marginBottom: '1rem'}}>Create New Professor</h2>
      <form onSubmit={handleCreateProfessor} style={{ display: 'flex', gap: '10px', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <input className="glass-input" style={{flex: 1}} type="text" placeholder="ID (e.g. PROF-01)" value={profId} onChange={(e) => setProfId(e.target.value)} required />
        <input className="glass-input" style={{flex: 1}} type="text" placeholder="Name" value={profName} onChange={(e) => setProfName(e.target.value)} required />
        <input className="glass-input" style={{flex: 1}} type="email" placeholder="Email" value={profEmail} onChange={(e) => setProfEmail(e.target.value)} required />
        <input className="glass-input" style={{flex: 1}} type="password" placeholder="Password" value={profPassword} onChange={(e) => setProfPassword(e.target.value)} required />
        <button type="submit" className="glass-button" style={{ width: 'auto' }}>Create</button>
      </form>
      {/* DISPLAYING THE PROFESSORS */}
      <h2 style={{color: 'white', marginBottom: '1rem'}}>Existing Professors</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
        {/* 
            .map(): A built-in JavaScript array function. 
            It loops through the 'professors' array and creates a new HTML <div> for each one! 
        */}
        {professors.map((prof) => (
          <div key={prof._id} style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', color: 'white' }}>
            <p><strong>Name:</strong> {prof.name} | <strong>ID:</strong> {prof.id} | <strong>Email:</strong> {prof.email}</p>
          </div>
        ))}
        
        {/* If the array is empty, we show a fallback message */}
        {professors.length === 0 && <p style={{color: 'gray'}}>No professors found.</p>}
      
      </div>
    </div>
  );
};

export default AdminDashboard