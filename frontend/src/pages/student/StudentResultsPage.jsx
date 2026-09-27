import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Target, Search, FileText, ChevronRight, X, Clock, Calendar, CheckCircle2, AlertCircle, XCircle, ChevronDown } from 'lucide-react';

const StudentResultsPage = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedResult, setSelectedResult] = useState(null);
    const [expandedResults, setExpandedResults] = useState({});
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('studentToken');
        if (!token) return navigate('/student/login');

        const fetchData = async () => {
            try {
                const response = await axios.get('/api/students/results', { headers: { Authorization: `Bearer ${token}` } });
                setResults(response.data.results || []);
            } catch (error) {
                console.error("Failed to fetch results", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const getGrade = (pct) => {
        if (pct >= 90) return 'A+';
        if (pct >= 80) return 'A';
        if (pct >= 70) return 'B';
        if (pct >= 60) return 'C';
        if (pct >= 50) return 'D';
        return 'F';
    };

    const toggleExpand = (id) => {
        setExpandedResults(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getFilteredResults = () => {
        if (!searchQuery) return results;
        return results.filter(r => 
            r.exam?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.exam?.examinationId?.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const filteredResults = getFilteredResults();

    if (loading) {
        return (
            <div style={{ padding: 32 }}>
                <div style={{ height: 40, width: 200, background: 'var(--bg-card)', borderRadius: 8, marginBottom: 32, animation: 'pulse 2s infinite' }} />
                <div style={{ height: 400, background: 'var(--bg-card)', borderRadius: 12, animation: 'pulse 2s infinite' }} />
            </div>
        );
    }

    // Grouping
    const groupedResults = {};
    const standaloneResults = [];

    filteredResults.forEach(result => {
        if (result.exam?.examinationId) {
            const pId = String(result.exam.examinationId._id);
            if (!groupedResults[pId]) {
                groupedResults[pId] = {
                    examination: result.exam.examinationId,
                    results: []
                };
            }
            groupedResults[pId].results.push(result);
        } else {
            standaloneResults.push(result);
        }
    });

    const groups = Object.values(groupedResults);

    const renderResultRow = (result, isChild = false) => {
        const pct = Math.round((result.score / result.totalQuestions) * 100);
        const grade = getGrade(pct);
        const isReleased = result.exam?.examinationId 
            ? result.exam.examinationId.isResultReleased === true 
            : result.exam?.isResultReleased === true;
        
        return (
            <tr key={result._id} style={{ borderBottom: '1px solid var(--border-default)', transition: 'background 0.2s ease', background: isChild ? 'var(--bg-body)' : 'transparent' }} className={isChild ? "" : "table-row-hover"}>
                <td style={{ padding: isChild ? '16px 24px 16px 48px' : '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: isChild ? 'var(--bg-card)' : 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                            <FileText size={16} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                            {isChild ? (result.exam?.title?.split(' - ').pop() || 'Deleted Exam') : (result.exam?.title || 'Deleted Exam')}
                        </span>
                    </div>
                </td>
                <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
                    {new Date(result.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    {isReleased ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{pct}%</span>
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{result.score} / {result.totalQuestions} pts</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Not Released</span>
                        </div>
                    )}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    {isReleased ? (
                        <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            fontSize: 13, 
                            fontWeight: 700, 
                            background: pct >= 70 ? 'var(--success-subtle)' : pct >= 50 ? 'var(--warning-subtle)' : 'var(--danger-subtle)',
                            color: pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)'
                        }}>
                            {grade}
                        </span>
                    ) : (
                        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>-</span>
                    )}
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button 
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, opacity: isReleased ? 1 : 0.5, cursor: isReleased ? 'pointer' : 'not-allowed' }}
                        onClick={() => isReleased && setSelectedResult(result)}
                        disabled={!isReleased}
                    >
                        Details <ChevronRight size={14} />
                    </button>
                </td>
            </tr>
        );
    };

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 48 }}>
            <div className="page-header" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>Results History</h1>
                    <p className="page-subtitle" style={{ fontSize: 15 }}>Review your past examination performance.</p>
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

            <div className="card" style={{ overflow: 'hidden' }}>
                {filteredResults.length === 0 ? (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--text-tertiary)' }}>
                            <Target size={32} />
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No results found</h3>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>You haven't completed any exams yet.</p>
                        <button 
                            onClick={() => navigate('/student/exams')}
                            className="btn btn-primary"
                            style={{ marginTop: 24, padding: '10px 24px' }}
                        >
                            Browse Exams
                        </button>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-body)' }}>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exam Name</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Taken</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grade</th>
                                    <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Render Hierarchical Results */}
                                {groups.map(group => {
                                    const isExpanded = expandedResults[group.examination._id];
                                    const isReleased = group.examination.isResultReleased;

                                    let totalScore = 0;
                                    let totalQuestions = 0;
                                    group.results.forEach(r => {
                                        totalScore += r.score;
                                        totalQuestions += r.totalQuestions;
                                    });
                                    const overallPct = Math.round((totalScore / Math.max(1, totalQuestions)) * 100);
                                    const overallGrade = getGrade(overallPct);

                                    return (
                                        <React.Fragment key={group.examination._id}>
                                            <tr 
                                                onClick={() => toggleExpand(group.examination._id)}
                                                style={{ borderBottom: '1px solid var(--border-default)', cursor: 'pointer', background: isExpanded ? 'var(--bg-active)' : 'transparent', transition: 'background 0.2s ease' }} 
                                                className="table-row-hover"
                                            >
                                                <td style={{ padding: '16px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {isExpanded ? <ChevronDown size={18} color="var(--text-tertiary)" /> : <ChevronRight size={18} color="var(--text-tertiary)" />}
                                                        </div>
                                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                                                            <Target size={16} />
                                                        </div>
                                                        <div>
                                                            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{group.examination.title}</span>
                                                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{group.results.length} Subject{group.results.length !== 1 ? 's' : ''} Taken</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
                                                    -
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                    {isReleased ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                                            <span style={{ fontSize: 15, fontWeight: 600, color: overallPct >= 80 ? 'var(--success)' : overallPct >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{overallPct}%</span>
                                                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Overall</span>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Not Released</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                    {isReleased ? (
                                                        <span style={{ 
                                                            display: 'inline-flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center',
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: '50%',
                                                            fontSize: 13, 
                                                            fontWeight: 700, 
                                                            background: overallPct >= 70 ? 'var(--success-subtle)' : overallPct >= 50 ? 'var(--warning-subtle)' : 'var(--danger-subtle)',
                                                            color: overallPct >= 70 ? 'var(--success)' : overallPct >= 50 ? 'var(--warning)' : 'var(--danger)'
                                                        }}>
                                                            {overallGrade}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>-</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                    {/* Parent row has no direct details button, it's just an accordion */}
                                                </td>
                                            </tr>

                                            {isExpanded && group.results.map(result => renderResultRow(result, true))}
                                        </React.Fragment>
                                    );
                                })}

                                {/* Render Standalone Results */}
                                {standaloneResults.map(result => renderResultRow(result, false))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Result Detail Modal */}
            {selectedResult && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
                    <div className="card" style={{ width: '100%', maxWidth: 500, overflow: 'hidden', animation: 'slideIn 0.2s ease-out' }}>
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-body)' }}>
                            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Performance Report</h3>
                            <button onClick={() => setSelectedResult(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div style={{ padding: 32 }}>
                            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                                <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{selectedResult.exam?.title || 'Deleted Exam'}</h2>
                                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Completed on {new Date(selectedResult.createdAt).toLocaleDateString()}</p>
                            </div>

                            <div style={{ background: 'var(--bg-body)', borderRadius: 12, padding: 24, marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Final Score</p>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                        <span style={{ fontSize: 32, fontWeight: 700, color: Math.round((selectedResult.score / selectedResult.totalQuestions) * 100) >= 80 ? 'var(--success)' : Math.round((selectedResult.score / selectedResult.totalQuestions) * 100) >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                                            {Math.round((selectedResult.score / selectedResult.totalQuestions) * 100)}%
                                        </span>
                                        <span style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 600 }}>({selectedResult.score} / {selectedResult.totalQuestions})</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Grade</p>
                                    <span style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        fontSize: 20, 
                                        fontWeight: 700, 
                                        background: Math.round((selectedResult.score / selectedResult.totalQuestions) * 100) >= 70 ? 'var(--success-subtle)' : Math.round((selectedResult.score / selectedResult.totalQuestions) * 100) >= 50 ? 'var(--warning-subtle)' : 'var(--danger-subtle)',
                                        color: Math.round((selectedResult.score / selectedResult.totalQuestions) * 100) >= 70 ? 'var(--success)' : Math.round((selectedResult.score / selectedResult.totalQuestions) * 100) >= 50 ? 'var(--warning)' : 'var(--danger)'
                                    }}>
                                        {getGrade(Math.round((selectedResult.score / selectedResult.totalQuestions) * 100))}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ border: '1px solid var(--border-default)', padding: 16, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ color: 'var(--success)' }}><CheckCircle2 size={20} /></div>
                                    <div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Correct Answers</div>
                                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedResult.score}</div>
                                    </div>
                                </div>
                                <div style={{ border: '1px solid var(--border-default)', padding: 16, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ color: 'var(--danger)' }}><XCircle size={20} /></div>
                                    <div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Incorrect Answers</div>
                                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedResult.totalQuestions - selectedResult.score}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: 32, padding: 16, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', gap: 12 }}>
                                <AlertCircle size={20} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    Question-level review is not available for this exam. Reach out to your instructor for detailed feedback.
                                </p>
                            </div>
                        </div>
                        
                        <div style={{ padding: '16px 32px', borderTop: '1px solid var(--border-default)', background: 'var(--bg-body)', textAlign: 'right' }}>
                            <button onClick={() => setSelectedResult(null)} className="btn btn-secondary">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentResultsPage;
