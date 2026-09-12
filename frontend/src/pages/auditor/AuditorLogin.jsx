import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react'
import AuthShell from '../../components/auth/AuthShell';

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
        <AuthShell 
          title="Audit & Assurance" 
          subtitle="Review activity, exam integrity, and platform evidence."
          badge="AUTHORIZED ACCESS"
        >
          <form className="auth-form" onSubmit={handleLogin}>
            {error && <div className="auth-error" role="alert">{error}</div>}
            
            <div className="auth-input-group">
              <label htmlFor="auditor-email">Auditor Email</label>
              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon" size={18} />
                <input
                  id="auditor-email"
                  type="email"
                  className="auth-input"
                  placeholder="auditor@zeroleak.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>
            
            <div className="auth-input-group">
              <label htmlFor="auditor-password">Password</label>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" size={18} />
                <input
                  id="auditor-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Sign In as Auditor
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13 }}>
              <Link to="/admin/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  Switch to Admin Login →
              </Link>
          </div>
        </AuthShell>
    )
}
