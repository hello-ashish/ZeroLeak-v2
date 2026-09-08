import React, { useState } from "react"
import axios from "axios"
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react';
import './Login.css';

const AdminLogin = () => {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')

        try {
            const response = await axios.post("http://localhost:4000/api/admin/login", {
                email: email,
                password: password
            })

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
        <div className="login-wrapper">
            <div className="login-container">
                <div className="login-header">
                    <img src="/logo.png" alt="ZeroLeak Logo" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', margin: '0 auto 1.5rem', display: 'block', boxShadow: '0 8px 24px rgba(88, 101, 242, 0.3)' }} />
                    <h1 className="login-brand">ZeroLeak</h1>
                    <p className="login-subtitle">Admin Access Portal</p>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>Admin Email</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={20} />
                            <input
                                type="email"
                                className="glass-input-modern"
                                placeholder="Enter admin email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="input-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                            <Lock className="input-icon" size={20} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="glass-input-modern"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{ paddingRight: '45px' }}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="btn-submit">
                        <LogIn size={20} />
                        Sign In as Admin
                    </button>
                </form>

                <Link to="/" className="back-link">
                    <ArrowLeft size={16} />
                    Back to Home
                </Link>
            </div>
        </div>
    )
}

export default AdminLogin