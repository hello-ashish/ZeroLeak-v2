import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, PlayCircle, CheckCircle2, Clock, Calendar, FileText, ShieldAlert, Lock, ChevronDown, ChevronRight, Timer } from 'lucide-react';

const StudentExamsPage = () => {
    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Available');
    const [expandedExams, setExpandedExams] = useState({});
    const navigate = useNavigate();

    // Live timer
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('studentToken');
        if (!token) return navigate('/student/login');

        const fetchData = async () => {
            try {
                const [examsRes, resultsRes] = await Promise.all([
                    axios.get('/api/students/exams', { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get('/api/students/results', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setExams(examsRes.data.exams || []);
                setResults(resultsRes.data.results || []);
            } catch (error) {
                console.error("Failed to fetch exams", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const toggleExpand = (id) => {
        setExpandedExams(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const completedExamIds = new Set(
        results.filter(r => !r.isTerminated).map(r => String(r.exam?._id || r.exam))
    );
    const terminatedExamIds = new Set(
        results.filter(r => r.isTerminated && !r.resetByAdmin).map(r => String(r.exam?._id || r.exam))
    );

    const getExamStatus = (exam) => {
        const id = String(exam._id);
        if (terminatedExamIds.has(id)) return 'blocked';
        if (completedExamIds.has(id)) return 'completed';

        if (exam.status === 'Completed') return 'closed';

        if ((exam.status === "Scheduled" || exam.status === "Live") && exam.scheduledAt && exam.endsAt) {
            const startTime = new Date(exam.scheduledAt);
            const endTime = new Date(exam.endsAt);
            const timeDiff = startTime.getTime() - now.getTime();

            if (now.getTime() > endTime.getTime()) {
                return 'closed'; // Past the end time
            } else if (now.getTime() >= startTime.getTime()) {
                return 'available'; // Currently running
            } else if (timeDiff <= 30 * 60 * 1000) {
                return 'upcoming'; // Within 30 mins
            } else {
                return 'hidden'; // Too far in future
            }
        }
        if (exam.status === 'Completed') return 'closed';
        return 'available';
    };

    const getFilteredExams = () => {
        let filtered = exams.filter(e => {
            const status = getExamStatus(e);
            if (status === 'hidden') return false;
            if (activeTab === 'Available') return status === 'available' || status === 'upcoming';
            if (activeTab === 'Completed') return status === 'completed';
            if (activeTab === 'Blocked') return status === 'blocked';
            if (activeTab === 'Missed') return status === 'closed';
            return true;
        });

        if (searchQuery) {
            filtered = filtered.filter(e =>
                e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.examinationId?.title?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    };

    const filteredExams = getFilteredExams();

    const tabCounts = {
        Available: exams.filter(e => { const s = getExamStatus(e); return s === 'available' || s === 'upcoming'; }).length,
        Completed: exams.filter(e => getExamStatus(e) === 'completed').length,
        Blocked: exams.filter(e => getExamStatus(e) === 'blocked').length,
        Missed: exams.filter(e => getExamStatus(e) === 'closed').length,
    };

    if (loading) {
        return (
            <div style={{ padding: 32 }}>
                <div style={{ height: 40, width: 200, background: 'var(--bg-card)', borderRadius: 8, marginBottom: 32, animation: 'pulse 2s infinite' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ height: 120, background: 'var(--bg-card)', borderRadius: 12, animation: 'pulse 2s infinite' }} />)}
                </div>
            </div>
        );
    }

    const groupedExams = {};
    const standaloneExams = [];

    filteredExams.forEach(exam => {
        if (exam.examinationId) {
            const pId = String(exam.examinationId._id);
            if (!groupedExams[pId]) {
                groupedExams[pId] = {
                    examination: exam.examinationId,
                    subjects: []
                };
            }
            groupedExams[pId].subjects.push(exam);
        } else {
            standaloneExams.push(exam);
        }
    });

    const groups = Object.values(groupedExams).sort((a, b) => new Date(b.examination.createdAt || 0) - new Date(a.examination.createdAt || 0));

    const formatTimeLeft = (ms) => {
        if (ms <= 0) return "0s";
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${m}m ${s}s`;
    };

    const renderExamCard = (exam, isChild = false) => {
        const status = getExamStatus(exam);
        const isBlocked = status === 'blocked';
        const isCompleted = status === 'completed';
        const isClosed = status === 'closed';
        const isUpcoming = status === 'upcoming';
        const isAvailable = status === 'available';

        let borderColor = 'var(--brand-primary)';
        if (isBlocked) borderColor = 'var(--danger)';
        if (isCompleted) borderColor = 'var(--success)';
        if (isClosed) borderColor = 'var(--text-tertiary)';
        if (isUpcoming) borderColor = 'var(--warning)';

        return (
            <div
                key={exam._id}
                style={{
                    padding: isChild ? '20px 24px' : 24,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isChild ? 'transparent' : 'var(--bg-card)',
                    borderRadius: isChild ? 0 : 'var(--radius-lg)',
                    border: isChild ? 'none' : '1px solid var(--border-default)',
                    borderBottom: isChild ? '1px solid var(--border-subtle)' : undefined,
                    transition: 'transform 0.2s ease, border-color 0.2s ease',
                    borderLeft: `4px solid ${borderColor}`,
                    opacity: isBlocked ? 0.85 : 1,
                    marginBottom: isChild ? 0 : 16
                }}
            >
                <div style={{ flex: 1, paddingRight: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <h3 style={{ fontSize: isChild ? 16 : 18, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {isChild ? exam.title.split(' - ').pop() : exam.title}
                        </h3>

                        {isBlocked ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Lock size={11} /> Blocked
                            </span>
                        ) : isCompleted ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', background: 'var(--success-subtle)', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle2 size={12} /> Completed
                            </span>
                        ) : isClosed ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-body)', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--border-default)' }}>
                                <Lock size={11} /> Closed
                            </span>
                        ) : isUpcoming ? (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)', background: 'var(--warning-subtle)', padding: '2px 8px', borderRadius: 12, border: '1px solid var(--warning-border)' }}>Upcoming</span>
                        ) : (
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-primary)', background: 'var(--bg-body)', padding: '2px 8px', borderRadius: 12, border: '1px solid var(--border-default)' }}>Available</span>
                        )}
                    </div>

                    {!isChild && <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: isBlocked ? 12 : 16, lineHeight: 1.5 }}>{exam.description}</p>}

                    {isBlocked && (
                        <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ShieldAlert size={13} />
                            Terminated due to anti-cheating violations.
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 24, fontSize: 13, color: 'var(--text-tertiary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> {exam.questions?.length || 0} Questions</span>

                        {(exam.status === "Scheduled" || exam.status === "Live") && exam.scheduledAt && exam.endsAt ? (
                            <>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', fontWeight: 500 }}>
                                    <Calendar size={14} /> {new Date(exam.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(exam.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isUpcoming && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--warning)', fontWeight: 600 }}>
                                        <Timer size={14} /> Starts in {formatTimeLeft(new Date(exam.scheduledAt).getTime() - now.getTime())}
                                    </span>
                                )}
                                {isAvailable && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontWeight: 600 }}>
                                        <Timer size={14} /> Ends in {formatTimeLeft(new Date(exam.endsAt).getTime() - now.getTime())}
                                    </span>
                                )}
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Clock size={14} /> {exam.durationMinutes} mins
                                </span>
                            </>
                        ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                <Timer size={14} /> {exam.durationMinutes} mins
                            </span>
                        )}
                    </div>
                </div>

                <div>
                    {isBlocked ? (
                        <button
                            disabled
                            style={{
                                padding: '10px 20px',
                                fontSize: 14,
                                background: 'rgba(239,68,68,0.08)',
                                color: 'var(--danger)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: 8,
                                cursor: 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                opacity: 0.7
                            }}
                        >
                            <Lock size={14} /> Access Blocked
                        </button>
                    ) : isClosed ? (
                        <button
                            disabled
                            style={{
                                padding: '8px 16px',
                                fontSize: 14,
                                background: 'var(--bg-body)',
                                color: 'var(--text-tertiary)',
                                border: '1px solid var(--border-default)',
                                borderRadius: 8,
                                cursor: 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            Exam Closed
                        </button>
                    ) : isCompleted ? (
                        <button
                            onClick={() => navigate('/student/results')}
                            className="btn btn-secondary"
                            style={{ padding: '8px 16px', fontSize: 14 }}
                        >
                            View Result
                        </button>
                    ) : isUpcoming ? (
                        <button
                            disabled
                            style={{
                                padding: '8px 16px',
                                fontSize: 14,
                                background: 'var(--warning-subtle)',
                                color: 'var(--warning)',
                                border: '1px solid var(--warning-border)',
                                borderRadius: 8,
                                cursor: 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            <Lock size={14} /> Starts Soon
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate(`/student/take-exam/${exam._id}`)}
                            className="btn btn-primary"
                            style={{ padding: '8px 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            Start <PlayCircle size={16} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 48 }}>
            <div className="page-header" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>My Exams</h1>
                    <p className="page-subtitle" style={{ fontSize: 15 }}>Browse and take your assigned examinations.</p>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ position: 'relative', width: 280 }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            type="text"
                            placeholder="Search exams..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '10px 16px 10px 36px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 14 }}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border-default)', marginBottom: 32 }}>
                {['Available', 'Completed', 'Missed', 'Blocked', 'All'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '0 0 16px',
                            fontSize: 14,
                            fontWeight: activeTab === tab ? 600 : 500,
                            color: tab === 'Blocked'
                                ? (activeTab === tab ? 'var(--danger)' : 'rgba(239,68,68,0.55)')
                                : (activeTab === tab ? 'var(--brand-primary)' : 'var(--text-secondary)'),
                            borderBottom: activeTab === tab
                                ? `2px solid ${tab === 'Blocked' ? 'var(--danger)' : 'var(--brand-primary)'}`
                                : '2px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        {tab}
                        {tab !== 'All' && tabCounts[tab] > 0 && (
                            <span style={{
                                fontSize: 11,
                                fontWeight: 600,
                                background: tab === 'Blocked' ? 'rgba(239,68,68,0.12)' : 'var(--bg-body)',
                                color: tab === 'Blocked' ? 'var(--danger)' : 'var(--text-tertiary)',
                                padding: '1px 6px',
                                borderRadius: 10,
                                minWidth: 18,
                                textAlign: 'center'
                            }}>
                                {tabCounts[tab]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Blocked Banner */}
            {activeTab === 'Blocked' && tabCounts.Blocked > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '14px 18px',
                    borderRadius: 10,
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    marginBottom: 24,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6
                }}>
                    <ShieldAlert size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 1 }} />
                    <div>
                        <strong style={{ color: 'var(--danger)' }}>Exam access blocked.</strong> These exams were locked because your attempt was terminated after exceeding the maximum allowed security violations.
                        Contact your administrator to review and potentially restore access.
                    </div>
                </div>
            )}

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredExams.length === 0 ? (
                    <div className="card" style={{ padding: 48, textAlign: 'center', borderStyle: 'dashed' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--text-tertiary)' }}>
                            <FileText size={32} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No exams found</h3>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>There are no {activeTab.toLowerCase()} exams matching your criteria.</p>
                    </div>
                ) : (
                    <>
                        {/* Grouped Examinations */}
                        {groups.map(group => {
                            const isExpanded = expandedExams[group.examination._id];
                            return (
                                <div key={group.examination._id} className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
                                    <div
                                        onClick={() => toggleExpand(group.examination._id)}
                                        style={{
                                            padding: 24,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 20,
                                            cursor: 'pointer',
                                            background: isExpanded ? 'var(--bg-active)' : 'transparent',
                                            transition: 'background 0.2s ease',
                                            borderBottom: isExpanded ? '1px solid var(--border-default)' : 'none'
                                        }}
                                    >
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 8, background: 'var(--bg-body)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {isExpanded ? <ChevronDown size={20} color="var(--text-tertiary)" /> : <ChevronRight size={20} color="var(--text-tertiary)" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                                                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{group.examination.title}</h3>
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', display: 'flex', gap: 16 }}>
                                                <span>{group.subjects.length} Subject{group.subjects.length !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Children */}
                                    {isExpanded && (
                                        <div style={{ background: 'var(--bg-body)', padding: '0 24px' }}>
                                            <div style={{ padding: '16px 0 0 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                SUBJECTS
                                            </div>
                                            {group.subjects.map((subj, idx) => {
                                                const isLast = idx === group.subjects.length - 1;
                                                return (
                                                    <div key={subj._id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)' }}>
                                                        {renderExamCard(subj, true)}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Standalone Exams */}
                        {standaloneExams.map(exam => renderExamCard(exam, false))}
                    </>
                )}
            </div>
        </div>
    );
};

export default StudentExamsPage;
