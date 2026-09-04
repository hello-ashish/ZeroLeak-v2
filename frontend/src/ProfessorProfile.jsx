import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const ProfessorProfile = () => {
    const [formData, setFormData] = useState({ name: '', email: '', contact: '', address: '', password: '' })
    const [message, setMessage] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        const profDataString = localStorage.getItem('profData')
        if(!profDataString) {
            navigate('/professor/login')
        } else {
            const profData = JSON.parse(profDataString)
            setFormData({
                name: profData.name || '', 
                email: profData.email || '', 
                contact: profData.contact || '', 
                address: profData.address || '', 
                password: ''
            })
        }
    }, [navigate])

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('profToken')
            const payload = { 
                name: formData.name,
                email: formData.email, 
                contact: formData.contact, 
                address: formData.address
            }
            if (formData.password) payload.password = formData.password

            const response = await axios.put('http://localhost:4000/api/professor/profile', payload, {
                headers: { Authorization: `Bearer ${token}`}
            })

            localStorage.setItem('profData', JSON.stringify(response.data.professor))
            setMessage('Profile Updated Successfully')
            setTimeout(() => {
                navigate('/professor/dashboard')
            }, 1500)
        } catch (error) {
            setMessage('Error updating profile.')
        }
    }

    return (
    <div className="glass-container" style={{ maxWidth: '500px', marginTop: '3rem' }}>
      <h2 className="glass-title" style={{ color: 'var(--accent-primary)' }}>Edit Profile</h2>
      {message && <p style={{ color: 'white', textAlign: 'center' }}>{message}</p>}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Name" className="glass-input" required />
        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="glass-input" required />
        <input type="text" name="contact" value={formData.contact} onChange={handleChange} placeholder="Contact No" className="glass-input" />
        <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Address" className="glass-input" />
        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="New Password (optional)" className="glass-input" />
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="glass-button" style={{ background: 'var(--accent-primary)', flex: 1 }}>Save</button>
          <button type="button" className="glass-button" style={{ background: 'var(--danger)', flex: 1 }} onClick={() => navigate('/professor/dashboard')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

export default ProfessorProfile