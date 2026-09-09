import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { AdminLayout } from './AdminLayout.jsx'
import { SkeletonTable, EmptyState } from '../../components/SkeletonLoader.jsx'
import { ScorePill } from '../../components/StatusBadge.jsx'
import { useToast } from '../../components/Toast.jsx'
import { Download, BarChart3, TrendingUp, Trophy, Search, ChevronRight, GraduationCap } from 'lucide-react'
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell } from 'recharts'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('adminToken')

const CHART_COLORS = {
    primary: 'var(--brand-primary)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
}

function getGrade(pct) {
    if (pct >= 90) return 'A+'
    if (pct >= 80) return 'A'
    if (pct >= 70) return 'B'
    if (pct >= 60) return 'C'
    if (pct >= 50) return 'D'
    return 'F'
}

const exportCSV = (data, filename) => {
    const headers = ['Rank', 'Student', 'Student ID', 'Exam', 'Score', 'Total', 'Percentage', 'Grade', 'Date']
    const rows = data.map((r, i) => {
        const pct = Math.round((r.score / r.totalQuestions) * 100)
        return [i + 1, r.student?.name || 'Unknown', r.student?.studentId || '', r.exam?.title || '', r.score, r.totalQuestions, `${pct}%`, getGrade(pct), new Date(r.createdAt).toLocaleDateString()]
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

export default function AdminGradebookPage() {
    const [results, setResults] = useState([])
    const [exams, setExams] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedExam, setSelectedExam] = useState('all')
    const [searchParams] = useSearchParams()
    const [search, setSearch] = useState(searchParams.get('student') || '')
    const [sortDir, setSortDir] = useState('desc')
    const navigate = useNavigate()
    const toast = useToast()

    useEffect(() => {
        const token = getToken()
        if (!token) { navigate('/admin/login'); return }

        const fetchData = async () => {
            try {
                setLoading(true)
                const [resRes, examRes] = await Promise.all([
                    axios.get(`${API}/exams/results`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API}/exams`, { headers: { Authorization: `Bearer ${token}` } }),
                ])
                setResults(resRes.data.results || [])
                setExams(examRes.data.exams || [])
            } catch {
                toast.error('Failed to load gradebook')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [navigate])

    const filtered = useMemo(() => {
        let data = results
        if (selectedExam === 'deleted') {
            data = data.filter(r => !r.exam)
        } else if (selectedExam !== 'all') {
            data = data.filter(r => r.exam?._id === selectedExam || r.exam === selectedExam)
        }
        
        if (search) {
            const s = search.toLowerCase()
            data = data.filter(r => r.student?.name?.toLowerCase().includes(s) || r.student?.studentId?.toLowerCase().includes(s))
        }
        
        return [...data].sort((a, b) => {
            const titleA = a.exam?.title || 'Deleted Exam'
            const titleB = b.exam?.title || 'Deleted Exam'
            
            if (titleA < titleB) return -1
            if (titleA > titleB) return 1
            
            const pa = (a.score / a.totalQuestions)
            const pb = (b.score / b.totalQuestions)
            return sortDir === 'desc' ? pb - pa : pa - pb
        })
    }, [results, selectedExam, search, sortDir])

    const hasOrphaned = useMemo(() => results.some(r => !r.exam), [results])

    const classSummary = useMemo(() => {
        if (filtered.length === 0) return null
        const pcts = filtered.map(r => (r.score / r.totalQuestions) * 100)
        
        // Distribution buckets
        const dist = [
            { range: '<50', count: pcts.filter(p => p < 50).length },
            { range: '50-69', count: pcts.filter(p => p >= 50 && p < 70).length },
            { range: '70-89', count: pcts.filter(p => p >= 70 && p < 90).length },
            { range: '90-100', count: pcts.filter(p => p >= 90).length },
        ]

        return {
            avg: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
            highest: Math.round(Math.max(...pcts)),
            lowest: Math.round(Math.min(...pcts)),
            passRate: Math.round((pcts.filter(p => p >= 50).length / pcts.length) * 100),
            total: pcts.length,
            dist
        }
    }, [filtered])

    return (
        <AdminLayout>
            <div className="page-header">
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Gradebook</h1>
                        <p className="page-subtitle">Academic performance records and aggregate analytics</p>
                    </div>
                    <div className="page-actions">
                        <button className="btn btn-secondary flex items-center gap-2" onClick={() => exportCSV(filtered, 'gradebook.csv')} disabled={!results.length}>
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Class Summary & Distribution */}
            {classSummary && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                    {/* Performance KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="kpi-module" style={{ padding: 20 }}>
                            <p className="kpi-module-title">Class Average</p>
                            <p className="kpi-module-value">{classSummary.avg}%</p>
                            <p className="kpi-module-sub" style={{ color: classSummary.avg >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                                {classSummary.avg >= 70 ? 'Above benchmark' : 'Below benchmark'}
                            </p>
                        </div>
                        <div className="kpi-module" style={{ padding: 20 }}>
                            <p className="kpi-module-title">Pass Rate</p>
                            <p className="kpi-module-value">{classSummary.passRate}%</p>
                            <p className="kpi-module-sub" style={{ color: classSummary.passRate >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                                {classSummary.total} total submissions
                            </p>
                        </div>
                        <div className="kpi-module" style={{ padding: 20, gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p className="kpi-module-title">Highest Score</p>
                                <p className="kpi-module-value" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {classSummary.highest}% <Trophy size={24} color="var(--brand-accent)" />
                                </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p className="kpi-module-title">Lowest Score</p>
                                <p className="kpi-module-value" style={{ fontSize: 24 }}>{classSummary.lowest}%</p>
                            </div>
                        </div>
                    </div>

                    {/* Distribution Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Score Distribution</h3>
                        </div>
                        <div className="card-body" style={{ height: 260, paddingBottom: 24 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={classSummary.dist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip 
                                        cursor={{ fill: 'var(--bg-hover)' }}
                                        contentStyle={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 13, boxShadow: 'var(--shadow-md)' }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                    />
                                    <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                                        {classSummary.dist.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 3 ? CHART_COLORS.success : index === 0 ? CHART_COLORS.danger : CHART_COLORS.primary} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap" style={{ alignItems: 'center' }}>
                <select className="form-select" style={{ width: 240 }} value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                    <option value="all">All Exams</option>
                    {exams.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
                    {hasOrphaned && <option value="deleted">Deleted Exams</option>}
                </select>
                <div className="search-input-wrap" style={{ flex: 1, maxWidth: 300 }}>
                    <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
                    <input className="search-input" placeholder="Search by student or ID..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}>
                    {sortDir === 'desc' ? '↓ Highest first' : '↑ Lowest first'}
                </button>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>{filtered.length} submissions</span>
            </div>

            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Student</th>
                            <th>Exam</th>
                            <th>Score</th>
                            <th>Percentage</th>
                            <th>Grade</th>
                            <th>Date</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                    </thead>
                    {loading ? (
                        <tbody>
                            {[...Array(7)].map((_, i) => (
                                <tr key={i}><td colSpan={8} style={{ padding: 12 }}><div className="skeleton" style={{ height: 14 }} /></td></tr>
                            ))}
                        </tbody>
                    ) : (
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={8}>
                                    <EmptyState
                                        icon={<BarChart3 size={32} color="var(--text-tertiary)" />}
                                        title="No results found"
                                        description={search || selectedExam !== 'all' ? 'Try a different search or filter.' : 'No exam submissions yet. Results will appear here as students complete exams.'}
                                    />
                                </td></tr>
                            ) : filtered.map((r, i) => {
                                const pct = Math.round((r.score / r.totalQuestions) * 100)
                                const grade = getGrade(pct)
                                return (
                                    <tr key={r._id}>
                                        <td>
                                            <span style={{
                                                fontSize: 13, fontWeight: 700, color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : 'var(--text-tertiary)'
                                            }}>#{i + 1}</span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="avatar avatar-sm" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                                    <GraduationCap size={16} />
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{r.student?.name || 'Unknown'}</p>
                                                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{r.student?.studentId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200 }}>
                                            <span className="truncate" style={{ display: 'block' }}>{r.exam?.title || 'Deleted Exam'}</span>
                                        </td>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                                            {r.score} / {r.totalQuestions}
                                        </td>
                                        <td><ScorePill score={r.score} total={r.totalQuestions} /></td>
                                        <td>
                                            <span style={{
                                                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                                                color: pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'
                                            }}>{grade}</span>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                            {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/admin/students`)}>
                                                Profile <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    )}
                </table>
            </div>
        </AdminLayout>
    )
}
