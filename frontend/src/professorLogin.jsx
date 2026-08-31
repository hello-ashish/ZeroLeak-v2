import React, { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"

const ProfessorLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')

        try {
            const response = await axios.post('http://localhost:4000/api/professor/login', {
                email,
                password
            })

            const { token, professor } = response.data

            localStorage.setItem('profToken', token)
            localStorage.setItem('profData', JSON.stringify(professor))

            navigate('/professor/dashboard')
        } catch (err) {
            if (err.response) setError(err.response.data.message);
            else setError('Server is not responding.');
        }
    }

    return (
        <div className="glass-container">
            <h1 className="glass-title">ZeroLeak</h1>
            <p className="glass-subtitle">Professor Portal Access</p>

            <form onSubmit={handleLogin}>
                <div className="input-group">
                    <label>Professor Email</label>
                    <input type="email" className="glass-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="input-group">
                    <label>Password</label>
                    <input type="password" className="glass-input" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit" className="glass-button">Login as Professor</button>
            </form>
        </div>
    )
}

export default ProfessorLogin