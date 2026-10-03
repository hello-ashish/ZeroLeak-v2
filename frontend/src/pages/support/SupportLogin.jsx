import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import axios from 'axios';
import AuthShell from '../../components/auth/AuthShell';
import '../../Login.css'; // Make sure styles are loaded if AuthShell doesn't import them

export default function SupportLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('/api/support/login', { email, password });
            if (res.data.success) {
                localStorage.setItem('supportToken', res.data.token);
                navigate('/support');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Support Portal"
            subtitle="Sign in to the ZeroLeak Support Dashboard to manage tickets."
            badge="SYSTEM ACCESS"
        >
            <form className="auth-form" onSubmit={handleLogin}>
                {error && <div className="auth-error" role="alert">{error}</div>}

                <div className="auth-input-group">
                    <label htmlFor="support-email">Support Email</label>
                    <div className="auth-input-wrapper">
                        <Mail className="auth-input-icon" size={18} />
                        <input
                            id="support-email"
                            type="email"
                            className="auth-input"
                            placeholder="Enter support email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            autoComplete="email"
                        />
                    </div>
                </div>

                <div className="auth-input-group">
                    <label htmlFor="support-password">Password</label>
                    <div className="auth-input-wrapper">
                        <Lock className="auth-input-icon" size={18} />
                        <input
                            id="support-password"
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
                        'Login'
                    )}
                </button>
            </form>
        </AuthShell>
    );
}
