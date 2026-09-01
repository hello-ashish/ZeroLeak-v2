import React, { useState } from "react"
import axios from "axios"
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
    const navigate = useNavigate()
    // create 3 state variables for email, password, and error message
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')

    // runs when user clicks submit button
    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')

        try {
            // axios to send a post request
            const response = await axios.post("http://localhost:4000/api/admin/login", {
                email: email,
                password: password
            })

            // the tokens send by backend
            const token = response.data.token
            const admin = response.data.admin

            localStorage.setItem('adminToken', token)
            localStorage.setItem('adminData', JSON.stringify(admin))
            navigate('/admin/dashboard')
        } catch (err) {
            if(err.response){
                setError(err.response.data.message)
            } else {
                setError("Service is not responding")
            }
        }
    }
    return (
        <div className='glass-container'>
            <h1 classname='glass-title'>ZeroLeak</h1>

            <form onSubmit={handleLogin}>

                <div className="imput-group">
                    <label>Admin Email</label>
                    <input
                        type="email"
                        className="glass-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                
                <div className="input-group">
                    <label>Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="glass-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ paddingRight: '3rem' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4px'
                            }}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 9.9A3 3 0 0 1 14.1 14.1M3 3l18 18" />
                                    <path d="M10.58 10.58A2 2 0 0 0 13.42 13.42" />
                                </svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {error && <p style={{color: 'red', marginBottom: '1rem'}}>{error}</p>}

                <button type="submit" className="glass-button">
                    Login
                </button>
            </form>
        </div>
    )
}

export default AdminLogin