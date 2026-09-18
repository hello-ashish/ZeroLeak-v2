import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LayoutDashboard, FileText, Database, Users, LogOut, ChevronDown, Search, Activity, ShieldAlert, GraduationCap, ClipboardList , RefreshCw } from 'lucide-react'
import { HeaderThemeSlider } from '../../components/HeaderThemeSlider.jsx'

const NAV = [
    {
        section: 'Overview',
        items: [
            { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/auditor/dashboard' },
        ]
    },
    {
        section: 'Audit',
        items: [
            { label: 'Audit Explorer', icon: <FileText size={18} />, path: '/auditor/audit' },
            { label: 'Anomalies', icon: <ShieldAlert size={18} />, path: '/auditor/anomalies' },
            { label: 'Cheating Detection', icon: <ShieldAlert size={18} />, path: '/admin/cheating' },
        ]
    },
    {
        section: 'Academic & People',
        items: [
            { label: 'Exams', icon: <ClipboardList size={18} />, path: '/auditor/exams' },
            { label: 'Students', icon: <GraduationCap size={18} />, path: '/auditor/students' },
            { label: 'Professors', icon: <Users size={18} />, path: '/auditor/professors' },
        ]
    }
]

export const AuditorLayout = ({ children, openAnomaliesCount = 0 }) => {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [showProfile, setShowProfile] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    const auditorData = JSON.parse(localStorage.getItem('auditorData') || '{}')

    const handleLogout = () => {
        localStorage.removeItem('auditorToken')
        localStorage.removeItem('auditorData')
        navigate('/')
    }

    const initials = (auditorData.email || 'A')
        .split('@')[0]
        .slice(0, 2)
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
                    <img src="/logo.png" alt="ZeroLeak Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 12px rgba(88, 101, 242, 0.3)' }} />
                    <div className="sidebar-brand-text">
                        <div className="brand-name">ZEROLEAK</div>
                        <div className="brand-sub">Auditor Console</div>
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
                                >
                                    <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                                    <span className="nav-label">{item.label}</span>
                                    {item.path === '/auditor/anomalies' && openAnomaliesCount > 0 && (
                                        <span className="nav-badge" style={{ background: 'var(--warning)', color: 'var(--bg-surface)' }}>
                                            {openAnomaliesCount}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="sidebar-footer">
                    <div className="nav-item" onClick={handleLogout} role="button" tabIndex={0}>
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
                    >
                        ☰
                    </button>

                    <div className="topbar-search">
                        <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
                        <span className="topbar-search-text">Search events (Read-only)</span>
                    </div>

                    <div className="topbar-actions">
                        <div className="badge" style={{ background: 'var(--brand-primary-subtle)', color: 'var(--brand-primary)', border: '1px solid var(--brand-primary-subtle)', fontWeight: 600, fontSize: 12 }}>
                            VIEW ONLY MODE
                        </div>
                        <HeaderThemeSlider />

                        {/* Refresh Button */}
                        <button
                            className="topbar-btn"
                            onClick={() => window.refreshCurrentPage && window.refreshCurrentPage()}
                            title="Refresh Page"
                            aria-label="Refresh Page"
                        >
                            <RefreshCw size={18} />
                        </button>


                        {/* Profile */}
                        <div className="dropdown">
                            <button
                                className="topbar-profile"
                                onClick={() => setShowProfile(v => !v)}
                            >
                                <span className="avatar avatar-sm">{initials}</span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {auditorData.name || auditorData.email?.split('@')[0] || 'Auditor'}
                                </span>
                                <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
                            </button>
                            {showProfile && (
                                <div className="dropdown-menu">
                                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {auditorData.name || 'Auditor'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{auditorData.email}</div>
                                    </div>
                                    <div className="dropdown-divider" />
                                    <button className="dropdown-item danger" onClick={handleLogout}><LogOut size={14} style={{ marginRight: 4 }} /> Logout</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="page-content">
                    {children}
                </main>
            </div>
        </div>
    )
}
