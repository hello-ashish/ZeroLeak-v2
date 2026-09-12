import React, { useState } from "react"
import axios from "axios"
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import AuthShell from './components/auth/AuthShell';

const AdminLogin = () => {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

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
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthShell 
          title="Admin Command Center" 
          subtitle="Manage the academic platform, users, examinations, and operations."
          badge="AUTHORIZED ACCESS"
        >
          <form className="auth-form" onSubmit={handleLogin}>
            {error && <div className="auth-error" role="alert">{error}</div>}
            
            <div className="auth-input-group">
              <label htmlFor="admin-email">Admin Email</label>
              <div className="auth-input-wrapper">
                <Mail className="auth-input-icon" size={18} />
                <input
                  id="admin-email"
                  type="email"
                  className="auth-input"
                  placeholder="Enter admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>
            
            <div className="auth-input-group">
              <label htmlFor="admin-password">Password</label>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" size={18} />
                <input
                  id="admin-password"
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
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In as Admin
                </>
              )}
            </button>
          </form>
        </AuthShell>
    )
}

export default AdminLogin