import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Target, ClipboardList, TrendingUp, TrendingDown, Clock, PlayCircle, CheckCircle2, Activity, User, ChevronRight, BookOpen } from 'lucide-react';

const StudentDashboardPage = () => {
    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const studentData = JSON.parse(localStorage.getItem('studentData') || '{}');

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
                
                // Sort results newest first
                const sortedResults = (resultsRes.data.results || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setResults(sortedResults);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    // --- DATA CALCULATIONS ---
    const completedExams = results.length;
    
    // Overall Average
    const averageScore = completedExams > 0
        ? Math.round(results.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions) * 100, 0) / completedExams)
        : 0;

    // Recent Trend (Last 3 vs Lifetime)
    let recentTrend = 0;
    if (completedExams >= 3) {
        const recent3 = results.slice(0, 3);
        const recentAvg = Math.round(recent3.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions) * 100, 0) / 3);
        recentTrend = recentAvg - averageScore;
    }

    // Subject Intelligence (Derived from first word of Exam Title)
    const subjects = {};
    results.forEach(r => {
        if (!r.exam) return;
        const subjectName = r.exam.title.split(' ')[0];
        if (!subjects[subjectName]) subjects[subjectName] = { totalPct: 0, count: 0 };
        subjects[subjectName].totalPct += (r.score / r.totalQuestions) * 100;
        subjects[subjectName].count += 1;
    });

    const subjectAverages = Object.entries(subjects).map(([name, data]) => ({
        name,
        avg: Math.round(data.totalPct / data.count)
    })).sort((a, b) => b.avg - a.avg);

    const strongestSubject = subjectAverages.length > 0 ? subjectAverages[0] : null;
    const needsAttention = subjectAverages.length > 1 ? subjectAverages[subjectAverages.length - 1] : null;

    // Up Next
    const takenExamIds = new Set(results.map(r => r.exam?._id));
    const availableExams = exams.filter(e => !takenExamIds.has(e._id));
    const upNext = availableExams.length > 0 ? availableExams[0] : null;

    // Helpers
    const getGrade = (pct) => {
        if (pct >= 90) return { letter: 'A+', color: 'var(--success)' };
        if (pct >= 80) return { letter: 'A', color: 'var(--success)' };
        if (pct >= 70) return { letter: 'B', color: 'var(--success)' };
        if (pct >= 60) return { letter: 'C', color: 'var(--warning)' };
        if (pct >= 50) return { letter: 'D', color: 'var(--warning)' };
        return { letter: 'F', color: 'var(--danger)' };
    };

    if (loading) {
        return (
            <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }



    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64, fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* Header & Identity Strip */}
            <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: 32, fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 16 }}>
                            Good evening, <span style={{ fontWeight: 500 }}>{studentData.name?.split(' ')[0] || 'Student'}</span>
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={14} /> {studentData.email}
                            </div>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border-default)' }} />
                            <div>Student ID: {studentData._id?.substring(0, 8).toUpperCase()}</div>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border-default)' }} />
                            <div style={{ color: 'var(--success)' }}>Active Status</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Tier: Next Move & Academic Pulse */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginBottom: 24, '@media (min-width: 1024px)': { gridTemplateColumns: '2fr 1fr' } }}>
                
                {/* YOUR NEXT MOVE */}
                <section style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Your Next Move</h2>
                    
                    {upNext ? (
                        <div style={{ flex: 1, background: 'linear-gradient(135deg, var(--brand-primary), #2563EB)', borderRadius: 16, padding: 32, color: 'white', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', right: -20, top: -40, opacity: 0.1 }}>
                                <PlayCircle size={200} />
                            </div>
                            <div style={{ position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(255,255,255,0.2)', borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} /> Available Now
                                </div>
                                <h3 style={{ fontSize: 28, fontWeight: 400, marginBottom: 8, letterSpacing: '-0.01em' }}>{upNext.title}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: 0.9, fontSize: 14, marginBottom: 32 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={16}/> {upNext.durationMinutes} Minutes</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Target size={16}/> {upNext.questions?.length || 0} Questions</span>
                                </div>
                                <button 
                                    onClick={() => navigate(`/student/take-exam/${upNext._id}`)}
                                    style={{ background: 'white', color: 'var(--brand-primary)', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'transform 0.1s' }}
                                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    Start Examination <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 16, padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 24 }}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--success-subtle)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>All Caught Up</h3>
                                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>You have no pending examinations. Review your recent performance below.</p>
                            </div>
                        </div>
                    )}
                </section>

                {/* ACADEMIC PULSE */}
                <section style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Academic Pulse</h2>
                    <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 16, padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Current Average</div>
                            <div style={{ fontSize: 32, fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1 }}>{averageScore}%</div>
                        </div>

                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Recent Trend</div>
                            {completedExams >= 3 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 18, fontWeight: 500, color: recentTrend >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                    {recentTrend >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                    {Math.abs(recentTrend)}%
                                </div>
                            ) : (
                                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Need 3 exams</div>
                            )}
                        </div>

                        <div style={{ gridColumn: '1 / -1', height: 1, background: 'var(--border-default)' }} />

                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Strongest</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{strongestSubject ? strongestSubject.name : '--'}</div>
                            {strongestSubject && <div style={{ fontSize: 12, color: 'var(--brand-primary)', marginTop: 2 }}>{strongestSubject.avg}%</div>}
                        </div>

                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Focus Area</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{needsAttention ? needsAttention.name : '--'}</div>
                            {needsAttention && <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 2 }}>{needsAttention.avg}%</div>}
                        </div>

                    </div>
                </section>
            </div>


            {/* Bottom Tier: Recent Results & Activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, '@media (min-width: 1024px)': { gridTemplateColumns: '2fr 1fr' } }}>
                
                {/* RECENT RESULTS */}
                <section style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Results</h2>
                        <button onClick={() => navigate('/student/results')} style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 16, overflow: 'hidden' }}>
                        {results.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>No past results available.</div>
                        ) : (
                            results.slice(0, 5).map((r, i) => {
                                const pct = Math.round((r.score / r.totalQuestions) * 100);
                                const grade = getGrade(pct);
                                return (
                                    <div key={r._id} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: i !== Math.min(results.length, 5) - 1 ? '1px solid var(--border-default)' : 'none', cursor: 'pointer', transition: 'background 0.2s' }} className="table-row-hover" onClick={() => navigate('/student/results')}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', marginRight: 16 }}>
                                            <BookOpen size={16} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{r.exam?.title || 'Deleted Exam'}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>{pct}%</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{r.score}/{r.totalQuestions}</div>
                                            </div>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: grade.color + '20', color: grade.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 }}>
                                                {grade.letter}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </section>

                {/* RECENT ACTIVITY TIMELINE */}
                <section style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Recent Activity</h2>
                    <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 16, padding: 24 }}>
                        {results.length === 0 ? (
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No recent activity.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                {results.slice(0, 4).map((r, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                                        {i !== Math.min(results.length, 4) - 1 && (
                                            <div style={{ position: 'absolute', left: 15, top: 32, bottom: -24, width: 2, background: 'var(--border-default)' }} />
                                        )}
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', zIndex: 1 }}>
                                            <ClipboardList size={14} />
                                        </div>
                                        <div style={{ paddingTop: 6 }}>
                                            <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>Completed <strong>{r.exam?.title}</strong></div>
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

            </div>

        </div>
    );
};

export default StudentDashboardPage;
