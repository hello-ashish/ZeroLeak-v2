import React, { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import AuthShell from './components/auth/AuthShell';

const ProfessorLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

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
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthShell 
          title="Professor Workspace" 
          subtitle="Create assessments, manage academic content, and review outcomes."
        >
          <form className="auth-form" onSubmit={handleLogin}>
            {error && <div className="auth-error" role="alert">{error}</div>}
            
            <div className="auth-input-group">
              <label htmlFor="prof-email">Professor Email</label>
              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon" size={18} />
                <input
                  id="prof-email"
                  type="email"
                  className="auth-input"
                  placeholder="Enter professor email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>
            
            <div className="auth-input-group">
              <label htmlFor="prof-password">Password</label>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" size={18} />
                <input
                  id="prof-password"
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
                  onClick={() => setShowPassword((prev) => !prev)}
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
                  Signing you in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </AuthShell>
    )
}

export default ProfessorLogin