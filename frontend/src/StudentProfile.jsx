import React, {useState, useEffect} from 'react';
import { useNavigate } from "react-router-dom"
import axios from "axios"

const StudentProfile = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' })
    const [message, setMessage] = useState('')

    const navigate = useNavigate()

    useEffect(() => {
        const studentDataString = localStorage.getItem('studentData')
        if(!studentDataString){
            navigate('/student/login')
        } else {
            const studentData = JSON.parse(studentDataString)
            setFormData({
                name: studentData.name,
                email: studentData.email,
                password: ''
            })
        }
    }, [navigate])

    const handleChange= async (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('studentToken')
            const payload = { name: formData.name, email: formData.email }
            if (formData.password) payload.password = formData.password

            const response = await axios.put('http://localhost:4000/api/students/profile', payload, {
                headers: { Authorization: `Bearer ${token}`}
            })

            localStorage.setItem('studentData', JSON.stringify(response.data.student))
            setMessage('Profile updated Successfully')
            setTimeout(() => navigate('/student/dashboard'), 1500)
        } catch (error) {
            setMessage('Error updating profile')
        }
    }
    return (
    <div className="glass-container" style={{ maxWidth: '500px', marginTop: '3rem' }}>
      <h2 className="glass-title" style={{ color: 'var(--success)' }}>Edit Profile</h2>
      {message && <p style={{ color: 'white', textAlign: 'center', marginBottom: '1rem' }}>{message}</p>}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="text" name="name" value={formData.name} onChange={handleChange} 
          placeholder="Name" className="glass-input" required 
        />
        <input 
          type="email" name="email" value={formData.email} onChange={handleChange} 
          placeholder="Email" className="glass-input" required 
        />
        <input 
          type="password" name="password" value={formData.password} onChange={handleChange} 
          placeholder="New Password (leave blank to keep current)" className="glass-input" 
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="glass-button" style={{ background: 'var(--success)', flex: 1 }}>Save</button>
          <button type="button" className="glass-button" style={{ background: 'var(--danger)', flex: 1 }} onClick={() => navigate('/student/dashboard')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

export default StudentProfile