import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { AdminLayout } from './AdminLayout.jsx'
import { useToast } from '../../components/Toast.jsx'
import { User, Palette, Lock, Info, Moon, Sun, AlertTriangle, Cpu, Globe, Database, Building2 } from 'lucide-react'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('adminToken')

export default function AdminSettingsPage() {
    const [activeSection, setActiveSection] = useState('profile')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [saving, setSaving] = useState(false)
    const [theme, setTheme] = useState(() => localStorage.getItem('zl-theme') || 'dark')
    const navigate = useNavigate()
    const toast = useToast()

    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}')

    useEffect(() => {
        setEmail(adminData.email || '')
    }, [])

    const handleThemeChange = (t) => {
        setTheme(t)
        document.documentElement.setAttribute('data-theme', t)
        localStorage.setItem('zl-theme', t)
    }

    const handleSaveProfile = async (e) => {
        e.preventDefault()
        if (password && password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }
        if (password && password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }
        setSaving(true)
        try {
            const body = {}
            if (email && email !== adminData.email) body.email = email
            if (password) body.password = password
            if (Object.keys(body).length === 0) {
                toast.info('No changes to save')
                return
            }
            await axios.put(`${API}/admin/profile`, body, {
                headers: { Authorization: `Bearer ${getToken()}` }
            })
            toast.success('Profile updated successfully')
            setPassword('')
            setConfirmPassword('')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const SECTIONS = [
        { id: 'profile', label: 'Admin Profile', icon: <User size={18} /> },
        { id: 'appearance', label: 'Appearance', icon: <Palette size={18} /> },
        { id: 'security', label: 'Security', icon: <Lock size={18} /> },
        { id: 'about', label: 'Platform Info', icon: <Info size={18} /> },
    ]

    return (
        <AdminLayout>
            <div className="page-header" style={{ marginBottom: 32 }}>
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Platform Settings</h1>
                        <p className="page-subtitle">Configure your administrative preferences and environment</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32, alignItems: 'start' }}>
                {/* Sidebar Nav */}
                <div style={{ position: 'sticky', top: 'var(--topbar-height)', paddingTop: 24, marginTop: -24 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {SECTIONS.map(s => (
                            <button
                                key={s.id}
                                className={`nav-item w-full ${activeSection === s.id ? 'active' : ''}`}
                                onClick={() => setActiveSection(s.id)}
                                style={{ 
                                    justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 12, 
                                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                                    fontSize: 14, fontWeight: activeSection === s.id ? 600 : 500,
                                    background: activeSection === s.id ? 'var(--bg-active)' : 'transparent',
                                    color: activeSection === s.id ? 'var(--brand-primary)' : 'var(--text-secondary)'
                                }}
                            >
                                {s.icon}
                                <span>{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div style={{ minWidth: 0, paddingBottom: 60 }}>
                    {activeSection === 'profile' && (
                        <div className="card" style={{ animation: 'dialogScale 200ms ease' }}>
                            <div className="card-header" style={{ padding: '24px 32px' }}>
                                <h2 className="card-title" style={{ fontSize: 18 }}>Profile Information</h2>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Manage your contact details and administrative identity.</p>
                            </div>
                            <form className="card-body" style={{ padding: '0 32px 32px' }} onSubmit={handleSaveProfile}>
                                <div className="flex items-center gap-6" style={{ padding: '24px 0', borderBottom: '1px solid var(--border-default)', marginBottom: 24 }}>
                                    <div className="avatar avatar-xl" style={{ width: 80, height: 80, fontSize: 32, background: 'var(--brand-primary)', color: '#fff' }}>
                                        {adminData.email?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>{adminData.email?.split('@')[0]}</p>
                                        <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>{adminData.email}</p>
                                        <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--brand-primary-subtle)', color: 'var(--brand-primary)', padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <ShieldCheck size={14} /> System Administrator
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group" style={{ maxWidth: 480 }}>
                                    <label className="form-label">Admin ID</label>
                                    <input className="form-input" value={adminData.adminId || '—'} disabled style={{ opacity: 0.6, cursor: 'not-allowed', background: 'var(--bg-surface)' }} />
                                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>Admin ID is immutable and serves as your permanent system identifier.</span>
                                </div>
                                <div className="form-group" style={{ maxWidth: 480 }}>
                                    <label className="form-label">Email Address</label>
                                    <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                                </div>
                                <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-default)' }}>
                                    <button className="btn btn-primary" type="submit" disabled={saving || email === adminData.email}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeSection === 'appearance' && (
                        <div className="card" style={{ animation: 'dialogScale 200ms ease' }}>
                            <div className="card-header" style={{ padding: '24px 32px' }}>
                                <h2 className="card-title" style={{ fontSize: 18 }}>Appearance Preferences</h2>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Customize the look and feel of your command center.</p>
                            </div>
                            <div className="card-body" style={{ padding: '0 32px 32px' }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Interface Theme</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 600 }}>
                                    {[
                                        { id: 'dark', label: 'Dark Mode', icon: <Moon size={24} />, desc: 'Deep, immersive background.' },
                                        { id: 'light', label: 'Light Mode', icon: <Sun size={24} />, desc: 'Bright, high-contrast design.' },
                                    ].map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => handleThemeChange(t.id)}
                                            style={{
                                                padding: '24px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                                                border: `2px solid ${theme === t.id ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                                                background: theme === t.id ? 'var(--bg-active)' : 'var(--bg-surface)',
                                                display: 'flex', flexDirection: 'column', gap: 12,
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: theme === t.id ? 'var(--brand-primary)' : 'var(--bg-elevated)', color: theme === t.id ? '#fff' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {t.icon}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{t.label}</p>
                                                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{t.desc}</p>
                                            </div>
                                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${theme === t.id ? 'var(--brand-primary)' : 'var(--border-strong)'}`, background: theme === t.id ? 'var(--brand-primary)' : 'transparent', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {theme === t.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'security' && (
                        <div className="card" style={{ animation: 'dialogScale 200ms ease' }}>
                            <div className="card-header" style={{ padding: '24px 32px' }}>
                                <h2 className="card-title" style={{ fontSize: 18 }}>Security Settings</h2>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Update your password and secure your account.</p>
                            </div>
                            <form className="card-body" style={{ padding: '0 32px 32px' }} onSubmit={handleSaveProfile}>
                                <div className="form-group" style={{ maxWidth: 480 }}>
                                    <label className="form-label">New Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: 70 }} />
                                        <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 12 }}>
                                            {showPass ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group" style={{ maxWidth: 480 }}>
                                    <label className="form-label">Confirm New Password</label>
                                    <input className="form-input" type="password" placeholder="Repeat the new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                    {confirmPassword && password !== confirmPassword && (
                                        <span className="form-error flex items-center gap-1 mt-1"><AlertTriangle size={14} /> Passwords do not match</span>
                                    )}
                                </div>
                                <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-default)' }}>
                                    <button className="btn btn-primary" type="submit" disabled={saving || !password}>
                                        {saving ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeSection === 'about' && (
                        <div className="card" style={{ animation: 'dialogScale 200ms ease' }}>
                            <div className="card-header" style={{ padding: '24px 32px' }}>
                                <h2 className="card-title" style={{ fontSize: 18 }}>About ZeroLeak</h2>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>System information and infrastructure details.</p>
                            </div>
                            <div className="card-body" style={{ padding: '0 32px 32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40, paddingBottom: 32, borderBottom: '1px solid var(--border-default)' }}>
                                    <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'white', boxShadow: '0 10px 30px -10px var(--brand-primary)' }}>ZL</div>
                                    <div>
                                        <p style={{ fontWeight: 800, fontSize: 24, color: 'var(--text-primary)' }}>ZeroLeak</p>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Academic Command Center · Edition 2.0</p>
                                    </div>
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                    {[
                                        { icon: <Globe size={18} />, k: 'Platform', v: 'Zero Trust Academic System' },
                                        { icon: <Cpu size={18} />, k: 'Core Engine', v: 'Vite + React 19' },
                                        { icon: <Database size={18} />, k: 'Infrastructure', v: 'Node.js + MongoDB' },
                                        { icon: <Building2 size={18} />, k: 'Developed By', v: 'Team ZeroLeak' },
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ color: 'var(--text-tertiary)' }}>{item.icon}</div>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.k}</div>
                                                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginTop: 2 }}>{item.v}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    )
}

function ShieldCheck(props) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
}
