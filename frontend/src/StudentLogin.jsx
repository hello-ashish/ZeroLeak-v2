import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import AuthShell from './components/auth/AuthShell';

const StudentLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const response = await axios.post('http://localhost:4000/api/students/login', {
            email,
            password
        });

        const { token, student } = response.data;

        localStorage.setItem('studentToken', token);
        localStorage.setItem('studentData', JSON.stringify(student));

        navigate('/student/dashboard');
    } catch (err) {
        if (err.response) setError(err.response.data.message);
        else setError('Server is not responding.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <AuthShell 
      title="Student Workspace" 
      subtitle="Take assessments, view results, and track your academic progress."
    >
      <form className="auth-form" onSubmit={handleLogin}>
        {error && <div className="auth-error" role="alert">{error}</div>}
        
        <div className="auth-input-group">
          <label htmlFor="student-email">Student Email</label>
          <div className="auth-input-wrapper">
            <Mail className="auth-input-icon" size={18} />
            <input
              id="student-email"
              type="email"
              className="auth-input"
              placeholder="Enter student email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
        </div>
        
        <div className="auth-input-group">
          <label htmlFor="student-password">Password</label>
          <div className="auth-input-wrapper">
            <Lock className="auth-input-icon" size={18} />
            <input
              id="student-password"
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
  );
};

export default StudentLogin;