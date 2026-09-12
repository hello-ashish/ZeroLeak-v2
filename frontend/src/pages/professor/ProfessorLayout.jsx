import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom'
import { LayoutDashboard, PackageOpen, Settings, Search, LogOut, ChevronDown, Bell, Plus, FileText , RefreshCw } from 'lucide-react'
import { CommandPalette } from '../../components/CommandPalette.jsx'
import { HeaderThemeSlider } from '../../components/HeaderThemeSlider.jsx'

const NAV = [
    {
        section: 'Overview',
        items: [
            { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/professor/dashboard' },
        ]
    },
    {
        section: 'Exams & Questions',
        items: [
            { label: 'My Batches', icon: <PackageOpen size={18} />, path: '/professor/batches' },
        ]
    },
    {
        section: 'System',
        items: [
            { label: 'Profile', icon: <Settings size={18} />, path: '/professor/profile' },
        ]
    }
]

export const ProfessorLayout = () => {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [showCommand, setShowCommand] = useState(false)
    const [showProfile, setShowProfile] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    const profData = JSON.parse(localStorage.getItem('profData') || '{}')

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

    const handleLogout = () => {
        localStorage.removeItem('profToken')
        localStorage.removeItem('profData')
        navigate('/')
    }

    const initials = (profData.name || profData.email || 'P')
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
                    <img src="/logo.png" alt="ZeroLeak Logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 12px rgba(88, 101, 242, 0.3)' }} />
                    <div className="sidebar-brand-text">
                        <div className="brand-name">ZEROLEAK</div>
                        <div className="brand-sub">Professor Portal</div>
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
                        <span className="topbar-search-text">Search students, exams, questions...</span>
                        <span className="topbar-search-kbd">⌘K</span>
                    </div>

                    <div className="topbar-actions">
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


                        {/* Notifications Dropdown */}
                        <div className="dropdown">
                            <button
                                className="topbar-btn"
                                onClick={() => setShowNotifications(v => !v)}
                                aria-expanded={showNotifications}
                                aria-label="Notifications"
                            >
                                <Bell size={18} />
                                <span className="topbar-btn-badge" />
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

                        {/* Quick Create Dropdown */}
                        <div className="dropdown">
                            <button
                                className="topbar-create-btn"
                                onClick={() => setShowCreate(v => !v)}
                                aria-expanded={showCreate}
                                aria-label="Quick create"
                            >
                                <Plus size={16} />
                                Create
                            </button>
                            {showCreate && (
                                <div className="dropdown-menu" style={{ minWidth: 200 }}>
                                    <button className="dropdown-item" onClick={() => { navigate('/professor/batches'); setShowCreate(false) }}><FileText size={14} style={{ marginRight: 4 }} /> New Batch</button>
                                </div>
                            )}
                        </div>

                        {/* Profile */}
                        <div className="dropdown">
                            <button
                                className="topbar-profile"
                                onClick={() => setShowProfile(v => !v)}
                                aria-expanded={showProfile}
                                aria-label="Professor profile menu"
                            >
                                <span className="avatar avatar-sm" aria-hidden="true">{initials}</span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {profData.name || profData.email?.split('@')[0] || 'Professor'}
                                </span>
                                <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
                            </button>
                            {showProfile && (
                                <div className="dropdown-menu">
                                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                                            {profData.name || profData.email?.split('@')[0] || 'Professor'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{profData.email}</div>
                                    </div>
                                    <button className="dropdown-item" onClick={() => { navigate('/professor/profile'); setShowProfile(false) }}><Settings size={14} style={{ marginRight: 4 }} /> Profile</button>
                                    <div className="dropdown-divider" />
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
        </div>
    )
}
