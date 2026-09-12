import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, BarChart3, Target, User, Settings, Search, Sun, Moon, LogOut, ChevronDown, Bell } from 'lucide-react'
import { CommandPalette } from '../../components/CommandPalette.jsx'
import { Modal } from '../../components/Modal.jsx'

import axios from 'axios';

const NAV = [
    {
        section: 'Overview',
        items: [
            { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/student/dashboard' },
        ]
    },
    {
        section: 'Academic',
        items: [
            { label: 'My Exams', icon: <ClipboardList size={18} />, path: '/student/exams' },
            { label: 'Results', icon: <Target size={18} />, path: '/student/results' },
            { label: 'Performance', icon: <BarChart3 size={18} />, path: '/student/performance' },
        ]
    },
    {
        section: 'Identity',
        items: [
            { label: 'Profile', icon: <User size={18} />, path: '/student/profile' },]
    }
]

export const StudentLayout = () => {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [showCommand, setShowCommand] = useState(false)
    const [showProfile, setShowProfile] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [showRestrictedModal, setShowRestrictedModal] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    const studentData = JSON.parse(localStorage.getItem('studentData') || '{}')

    const handleLogout = () => {
        localStorage.removeItem('studentToken')
        localStorage.removeItem('studentData')
        navigate('/')
    }

    // Global Axios Interceptor for Blocking
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && (error.response.status === 403 || error.response.data?.message === "BLOCKED")) {
                    setShowRestrictedModal(true);
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, []);

    // Cmd+K
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setShowCommand(v => !v)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    const initials = (studentData.name || studentData.email || 'S')
        .substring(0, 2)
        .toUpperCase()

    const isActive = (path) => location.pathname === path

    return (
        <div className="app-shell">
            {/* Sidebar */}
            <nav
                className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
                aria-label="Main navigation"
            >
                <div className="sidebar-brand">
                    <img src="/logo.png" alt="ZeroLeak Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }} />
                    <div className="sidebar-brand-text">
                        <div className="brand-name">ZEROLEAK</div>
                        <div className="brand-sub">Student Portal</div>
                    </div>
                </div>

                <div className="sidebar-nav">
                    {NAV.map(group => (
                        <div className="nav-section" key={group.section}>
                            <div className="nav-section-label">{group.section}</div>
                            {group.items.map(item => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                                    onClick={() => setMobileOpen(false)}
                                    title={collapsed ? item.label : undefined}
                                    aria-current={isActive(item.path) ? 'page' : undefined}
                                >
                                    <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                                    <span className="nav-label">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="sidebar-footer">
                    <div
                        className="nav-item"
                        onClick={handleLogout}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && handleLogout()}
                        title={collapsed ? 'Logout' : undefined}
                    >
                        <span className="nav-icon" aria-hidden="true" style={{ color: 'var(--danger)' }}><LogOut size={20} /></span>
                        <span className="nav-label" style={{ color: 'var(--danger)' }}>Logout</span>
                    </div>
                </div>
            </nav>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 'calc(var(--z-sidebar) - 1)' }}
                    onClick={() => setMobileOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Main */}
            <div className={`app-main ${collapsed ? 'sidebar-collapsed' : ''}`}>
                {/* Topbar */}
                <header className="topbar" role="banner">
                    <button
                        className="topbar-toggle"
                        onClick={() => { setCollapsed(c => !c); setMobileOpen(c => !c) }}
                        aria-label="Toggle sidebar"
                    >
                        ☰
                    </button>

                    <div
                        className="topbar-search"
                        onClick={() => setShowCommand(true)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && setShowCommand(true)}
                        aria-label="Open command palette"
                    >
                        <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
                        <span className="topbar-search-text">Search your exams and results...</span>
                        <span className="topbar-search-kbd">⌘K</span>
                    </div>

                    <div className="topbar-actions">
                        <button
                            className="topbar-btn"
                            onClick={() => window.dispatchEvent(new Event('zl-theme-slider-toggle'))}
                            aria-label="Adjust Brightness"
                            title="Toggle Brightness Slider"
                        >
                            <Sun size={18} />
                        </button>

                        {/* Notifications Dropdown */}
                        <div className="dropdown">
                            <button
                                className="topbar-btn"
                                onClick={() => setShowNotifications(v => !v)}
                                aria-expanded={showNotifications}
                                aria-label="Notifications"
                            >
                                <Bell size={18} />
                                <span className="topbar-btn-badge" style={{ background: 'var(--brand-primary)' }} />
                            </button>
                            {showNotifications && (
                                <div className="dropdown-menu" style={{ minWidth: 280, right: 0 }}>
                                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)', fontWeight: 600 }}>Notifications</div>
                                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                                        No new notifications
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile */}
                        <div className="dropdown">
                            <button
                                className="topbar-profile"
                                onClick={() => setShowProfile(v => !v)}
                                aria-expanded={showProfile}
                                aria-label="Student profile menu"
                            >
                                <span className="avatar avatar-sm" aria-hidden="true" style={{ background: 'var(--brand-primary)', color: 'white' }}>{initials}</span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {studentData.name || studentData.email?.split('@')[0] || 'Student'}
                                </span>
                                <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
                            </button>
                            {showProfile && (
                                <div className="dropdown-menu">
                                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                                            {studentData.name || studentData.email?.split('@')[0] || 'Student'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{studentData.email}</div>
                                    </div>
                                    <button className="dropdown-item" onClick={() => { navigate('/student/profile'); setShowProfile(false) }}><User size={14} style={{ marginRight: 4 }} /> Profile</button>                                    <div className="dropdown-divider" />
                                    <button className="dropdown-item danger" onClick={handleLogout}><LogOut size={14} style={{ marginRight: 4 }} /> Logout</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="page-content" id="main-content">
                    <Outlet />
                </main>
            </div>

            <CommandPalette open={showCommand} onClose={() => setShowCommand(false)} />

            <Modal 
                open={showRestrictedModal} 
                onClose={() => {}} // Disallow closing without logging out
                title="Account Restricted"
                footer={
                    <button className="btn btn-danger w-full" onClick={handleLogout}>
                        Return to Login
                    </button>
                }
            >
                <div style={{ padding: '8px 0' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Your account has been restricted by an administrator. Please contact support if you believe this is an error.
                    </p>
                </div>
            </Modal>
        </div>
    )
}
