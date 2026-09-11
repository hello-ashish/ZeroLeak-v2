import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import '../../Login.css'

const API = 'http://localhost:4000/api'

export default function AuditorLogin() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const response = await axios.post(`${API}/auditor/login`, { email, password })
            const { token, auditor } = response.data
            localStorage.setItem('auditorToken', token)
            localStorage.setItem('auditorData', JSON.stringify(auditor))
            navigate('/auditor/dashboard')
        } catch (err) {
            if (err.response) {
                setError(err.response.data.message)
            } else {
                setError('Service is not responding')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-wrapper">
            <div className="login-container">
                <div className="login-header">
                    <img src="/logo.png" alt="ZeroLeak Logo" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', margin: '0 auto 1.5rem', display: 'block', boxShadow: '0 8px 24px rgba(88, 101, 242, 0.3)' }} />
                    <h1 className="login-brand">ZeroLeak</h1>
                    <p className="login-subtitle">
                        <ShieldCheck size={14} style={{ display: 'inline', marginRight: 6 }} />
                        Auditor Console
                    </p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                        {error}
                    </div>
                )}

                <form className="login-form" onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>Auditor Email</label>
                        <div className="input-wrapper">
                            <Mail className="input-icon" size={20} />
                            <input
                                type="email"
                                className="glass-input-modern"
                                placeholder="auditor@zeroleak.com"
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
                                onClick={() => setShowPassword(prev => !prev)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn-submit" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Sign In as Auditor'}
                    </button>
                </form>

                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13 }}>
                    <Link to="/admin/login" style={{ color: '#a1a1aa', textDecoration: 'none' }}>
                        Switch to Admin Login →
                    </Link>
                </div>
            </div>
        </div>
    )
}
