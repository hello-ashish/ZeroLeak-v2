import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Database, BarChart3, GraduationCap, Users, PackageOpen, ScrollText, Blocks, Settings, Search, LogOut, ChevronDown, Command, Bell, Plus, RefreshCw, ShieldAlert, Map, Beaker, Activity } from 'lucide-react'
import { CommandPalette } from '../../components/CommandPalette.jsx'
import { HeaderThemeToggle } from '../../components/HeaderThemeToggle.jsx'
import { NotificationDropdown } from '../../components/NotificationDropdown.jsx'
import { SkeletonCard, Skeleton, SkeletonTable } from '../../components/SkeletonLoader.jsx'
import { useNotifications } from '../../hooks/useNotifications.jsx'

const NAV = [
    {
        section: 'Overview',
        items: [
            { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/admin/dashboard' },
        ]
    },
    {
        section: 'Academic',
        items: [
            { label: 'Exams', icon: <ClipboardList size={18} />, path: '/admin/exams' },
            { label: 'Paper Simulator', icon: <Beaker size={18} />, path: '/admin/simulator' },
            { label: 'Question Bank', icon: <Database size={18} />, path: '/admin/questions' },
            { label: 'Gradebook', icon: <BarChart3 size={18} />, path: '/admin/gradebook' },
        ]
    },
    {
        section: 'People',
        items: [
            { label: 'Students', icon: <GraduationCap size={18} />, path: '/admin/students' },
            { label: 'Professors', icon: <Users size={18} />, path: '/admin/professors' },
        ]
    },
    {
        section: 'Operations',
        items: [
            { label: 'Live Proctoring', icon: <Activity size={18} />, path: '/admin/proctoring' },
            { label: 'Cheating Detection', icon: <ShieldAlert size={18} />, path: '/admin/cheating' },
            { label: 'Batch Review', icon: <PackageOpen size={18} />, path: '/admin/batches', badgeKey: 'pendingBatches' },
            { label: 'Activity & Audit', icon: <ScrollText size={18} />, path: '/admin/activity' },
            { label: 'Blockchain Center', icon: <Blocks size={18} />, path: '/admin/blockchain' },
        ]
    },
    {
        section: 'System',
        items: [
            { label: 'Settings', icon: <Settings size={18} />, path: '/admin/settings' },
            { label: 'Reports & Feedback', icon: <ScrollText size={18} />, path: '/admin/feedback' },
        ]
    }
]

export const AdminLayout = ({ children, pendingBatchCount = 0 }) => {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [showCommand, setShowCommand] = useState(false)
    const [showProfile, setShowProfile] = useState(false)
    const [showCreate, setShowCreate] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)
    const notifRef = useRef(null)
    const profileRef = useRef(null)
    const createRef = useRef(null)
    const navigate = useNavigate()
    const location = useLocation()
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications('admin');

    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}')

    const handleRefresh = () => {
        setIsRefreshing(true);
        if (typeof fetchNotifications === 'function') fetchNotifications();
        setRefreshKey(prev => prev + 1);
        setTimeout(() => setIsRefreshing(false), 800);
    };

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifications(false)
            }
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setShowProfile(false)
            }
            if (createRef.current && !createRef.current.contains(e.target)) {
                setShowCreate(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

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
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminData')
        navigate('/')
    }

    const initials = (adminData.email || 'A')
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
                        <div className="brand-sub">Admin Command Center</div>
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
                                    {item.badgeKey === 'pendingBatches' && pendingBatchCount > 0 && (
                                        <span className="nav-badge" aria-label={`${pendingBatchCount} pending`}>
                                            {pendingBatchCount}
                                        </span>
                                    )}
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
                        <span className="topbar-search-text">Search {adminData.name ? adminData.name.split(' ')[0] + "'s" : "your"} admin workspace...</span>
                        <span className="topbar-search-kbd">⌘K</span>
                    </div>

                    <div className="topbar-actions">
                        <HeaderThemeToggle />

                        {/* Refresh Button */}
                        <button
                            className="topbar-btn"
                            onClick={handleRefresh}
                            title="Refresh Page"
                            aria-label="Refresh Page"
                        >
                            <RefreshCw size={18} />
                        </button>


                        {/* Notifications Dropdown */}
                        <NotificationDropdown
                            notifications={notifications}
                            unreadCount={unreadCount}
                            markAsRead={markAsRead}
                            markAllAsRead={markAllAsRead}
                            showNotifications={showNotifications}
                            setShowNotifications={setShowNotifications}
                            setShowProfile={setShowProfile}
                            setShowCreate={setShowCreate}
                            dropdownRef={notifRef}
                        />

                        {/* Quick Create Dropdown */}
                        <div className="dropdown" ref={createRef}>
                            <button
                                className="topbar-create-btn"
                                onClick={() => { setShowCreate(v => !v); setShowNotifications(false); setShowProfile(false) }}
                                aria-expanded={showCreate}
                                aria-label="Quick create"
                            >
                                <Plus size={16} />
                                Create
                            </button>
                            {showCreate && (
                                <div className="dropdown-menu" style={{ minWidth: 200 }}>
                                    <button className="dropdown-item" onClick={() => { navigate('/admin/exams'); setShowCreate(false) }}><ClipboardList size={14} style={{ marginRight: 4 }} /> New Exam</button>
                                    <button className="dropdown-item" onClick={() => { navigate('/admin/students'); setShowCreate(false) }}><GraduationCap size={14} style={{ marginRight: 4 }} /> Add Student</button>
                                    <button className="dropdown-item" onClick={() => { navigate('/admin/professors'); setShowCreate(false) }}><Users size={14} style={{ marginRight: 4 }} /> Add Professor</button>
                                    <div className="dropdown-divider" />
                                    <button className="dropdown-item" onClick={() => { navigate('/admin/batches'); setShowCreate(false) }}><PackageOpen size={14} style={{ marginRight: 4 }} /> Review Batches</button>
                                </div>
                            )}
                        </div>

                        {/* Profile */}
                        <div className="dropdown" ref={profileRef}>
                            <button
                                className="topbar-profile"
                                onClick={() => { setShowProfile(v => !v); setShowNotifications(false); setShowCreate(false) }}
                                aria-expanded={showProfile}
                                aria-label="Admin profile menu"
                            >
                                <span className="avatar avatar-sm" aria-hidden="true">{initials}</span>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {adminData.email?.split('@')[0] || 'Admin'}
                                </span>
                                <ChevronDown size={14} style={{ color: 'var(--text-tertiary)' }} />
                            </button>
                            {showProfile && (
                                <div className="dropdown-menu">
                                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                                            {adminData.email?.split('@')[0] || 'Admin'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{adminData.email}</div>
                                    </div>
                                    <button className="dropdown-item" onClick={() => { navigate('/admin/settings'); setShowProfile(false) }}><Settings size={14} style={{ marginRight: 4 }} /> Settings</button>
                                    <div className="dropdown-divider" />
                                    <button className="dropdown-item danger" onClick={handleLogout}><LogOut size={14} style={{ marginRight: 4 }} /> Logout</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="page-content" id="main-content">
                    {isRefreshing ? (
                        <div style={{ padding: '24px', display: 'grid', gap: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                                <SkeletonCard />
                                <SkeletonCard />
                                <SkeletonCard />
                            </div>
                            <div className="card">
                                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <Skeleton width="200px" height={20} />
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="table">
                                        <SkeletonTable rows={5} />
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <React.Fragment key={refreshKey}>
                            {children}
                        </React.Fragment>
                    )}
                </main>
            </div>

            <CommandPalette open={showCommand} onClose={() => setShowCommand(false)} />
        </div>
    )
}
