import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, PlayCircle, CheckCircle2, Clock, Calendar, FileText, ShieldAlert, Lock, ChevronDown, ChevronRight } from 'lucide-react';

const StudentExamsPage = () => {
    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Available');
    const [expandedExams, setExpandedExams] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('studentToken');
        if (!token) return navigate('/student/login');

        const fetchData = async () => {
            try {
                const [examsRes, resultsRes] = await Promise.all([
                    axios.get('http://localhost:4000/api/students/exams', { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get('http://localhost:4000/api/students/results', { headers: { Authorization: `Bearer ${token}` } })
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

    // ─── Classify results by status ────────────────────────────────────────────
    const completedExamIds = new Set(
        results.filter(r => !r.isTerminated).map(r => String(r.exam?._id || r.exam))
    );
    const terminatedExamIds = new Set(
        results.filter(r => r.isTerminated && !r.resetByAdmin).map(r => String(r.exam?._id || r.exam))
    );

    const getExamStatus = (examId) => {
        const id = String(examId);
        if (terminatedExamIds.has(id)) return 'blocked';
        if (completedExamIds.has(id)) return 'completed';
        return 'available';
    };

    const getFilteredExams = () => {
        let filtered = exams.filter(e => {
            const status = getExamStatus(e._id);
            if (activeTab === 'Available') return status === 'available';
            if (activeTab === 'Completed') return status === 'completed';
            if (activeTab === 'Blocked') return status === 'blocked';
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
        Available: exams.filter(e => getExamStatus(e._id) === 'available').length,
        Completed: exams.filter(e => getExamStatus(e._id) === 'completed').length,
        Blocked: exams.filter(e => getExamStatus(e._id) === 'blocked').length,
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

    // Grouping
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

    const renderExamCard = (exam, isChild = false) => {
        const status = getExamStatus(exam._id);
        const isBlocked = status === 'blocked';
        const isCompleted = status === 'completed';

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
                    borderLeft: isBlocked
                        ? '4px solid var(--danger)'
                        : isCompleted
                            ? '4px solid var(--success)'
                            : '4px solid var(--brand-primary)',
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 13, color: 'var(--text-tertiary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> {exam.durationMinutes} mins</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> {exam.questions?.length || 0} Questions</span>
                        {!isChild && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> Created: {new Date(exam.createdAt).toLocaleDateString()}</span>}
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
                    ) : isCompleted ? (
                        <button
                            onClick={() => navigate('/student/results')}
                            className="btn btn-secondary"
                            style={{ padding: '8px 16px', fontSize: 14 }}
                        >
                            View Result
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
                {['Available', 'Completed', 'Blocked', 'All'].map(tab => (
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
