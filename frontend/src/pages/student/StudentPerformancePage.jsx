import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, TrendingDown, Target, BookOpen, Activity, ChevronRight, Award, AlertCircle } from 'lucide-react';

const StudentPerformancePage = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('studentToken');
        if (!token) return navigate('/student/login');

        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:4000/api/students/results', { headers: { Authorization: `Bearer ${token}` } });
                setResults(response.data.results || []);
            } catch (error) {
                console.error("Failed to fetch results", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    if (loading) {

    return (
            <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 48, fontFamily: 'Inter, system-ui, sans-serif' }}>
                <div className="page-header" style={{ marginBottom: 48 }}>
                    <h1 className="page-title" style={{ fontSize: 32, fontWeight: 300, letterSpacing: '-0.02em', marginBottom: 8 }}>Academic Performance</h1>
                    <p className="page-subtitle" style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Understand your progress, strengths, and areas for improvement.</p>
                </div>

                <div style={{ padding: 64, textAlign: 'center', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-default)' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--brand-primary)' }}>
                        <Activity size={32} />
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 300, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.01em' }}>Your Performance Journey Starts Here</h3>
                    <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.5 }}>
                        Complete your first assessment to unlock intelligent performance analytics, mathematical trends, and subject intelligence.
                    </p>
                    <button onClick={() => navigate('/student/dashboard')} className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: 8, fontSize: 14 }}>
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // --- Core Data Arrays ---
    const sortedResults = [...results].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest to newest
    const reverseResults = [...sortedResults].reverse(); // Newest to oldest

    // --- Helper: Grade Mapping ---
    const getGrade = (pct) => {
        if (pct >= 90) return { letter: 'A+', color: 'var(--success)' };
        if (pct >= 80) return { letter: 'A', color: 'var(--success)' };
        if (pct >= 70) return { letter: 'B', color: 'var(--success)' };
        if (pct >= 60) return { letter: 'C', color: 'var(--warning)' };
        if (pct >= 50) return { letter: 'D', color: 'var(--warning)' };
        return { letter: 'F', color: 'var(--danger)' };
    };

    // --- Basic Metrics ---
    const completedExams = results.length;
    let bestScore = 0;
    let totalScorePct = 0;

    sortedResults.forEach(r => {
        const pct = (r.score / r.totalQuestions) * 100;
        if (pct > bestScore) bestScore = pct;
        totalScorePct += pct;
    });

    const averageScore = Math.round(totalScorePct / completedExams);

    // --- Personal Benchmark & Trend ---
    let windowSize = 0;
    if (completedExams >= 6) windowSize = 3;
    else if (completedExams >= 4) windowSize = 2;
    else if (completedExams >= 2) windowSize = 1;

    let recentAvg = averageScore;
    let prevAvg = averageScore;
    let trendDiff = 0;
    let trendContext = "Not enough data for trend";

    if (windowSize > 0) {
        const recentWindow = reverseResults.slice(0, windowSize);
        const prevWindow = reverseResults.slice(windowSize, windowSize * 2);

        recentAvg = Math.round(recentWindow.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / windowSize);
        prevAvg = Math.round(prevWindow.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / windowSize);
        trendDiff = recentAvg - prevAvg;
        trendContext = `vs previous ${windowSize} exams`;
    }

    // --- Subject Intelligence ---
    const calculateSubjectAverages = (resultsArray) => {
        const subjects = {};
        resultsArray.forEach(r => {
            if (!r.exam) return;
            const subjectName = r.exam.title.split(' ')[0]; // Group by first word
            if (!subjects[subjectName]) subjects[subjectName] = { total: 0, count: 0 };
            subjects[subjectName].total += (r.score / r.totalQuestions) * 100;
            subjects[subjectName].count += 1;
        });
        return Object.entries(subjects).map(([name, data]) => ({
            name,
            avg: Math.round(data.total / data.count)
        }));
    };

    const lifetimeSubjects = calculateSubjectAverages(results).sort((a, b) => b.avg - a.avg);
    const strongestSubject = lifetimeSubjects.length > 0 ? lifetimeSubjects[0] : null;

    // --- "Why Did My Score Change?" ---
    let whyInsight = "Complete more exams to unlock performance insights.";
    let whyDetails = [];

    if (windowSize >= 2) {
        const recentSubjs = calculateSubjectAverages(reverseResults.slice(0, windowSize));
        const prevSubjs = calculateSubjectAverages(reverseResults.slice(windowSize, windowSize * 2));

        let biggestGain = { name: null, diff: 0 };
        let biggestDrop = { name: null, diff: 0 };

        recentSubjs.forEach(rs => {
            const ps = prevSubjs.find(p => p.name === rs.name);
            if (ps) {
                const diff = rs.avg - ps.avg;
                if (diff > biggestGain.diff) biggestGain = { name: rs.name, diff };
                if (diff < biggestDrop.diff) biggestDrop = { name: rs.name, diff };
            }
        });

        if (trendDiff > 0) {
            whyInsight = `Your average improved by ${Math.abs(trendDiff)}% across your last ${windowSize} exams.`;
            if (biggestGain.name) whyDetails.push(`Main contribution: ${biggestGain.name} improved by ${biggestGain.diff}%.`);
        } else if (trendDiff < 0) {
            whyInsight = `Your average declined by ${Math.abs(trendDiff)}% across your last ${windowSize} exams.`;
            if (biggestDrop.name) whyDetails.push(`Main factor: ${biggestDrop.name} declined by ${Math.abs(biggestDrop.diff)}%.`);
        } else {
            whyInsight = `Your performance has remained completely stable across your last ${windowSize * 2} exams.`;
        }
    }

    // --- Next Recommended Action ---
    let nextAction = { title: "Keep going", desc: "Your scores are stable or improving.", icon: <Activity size={20} color="var(--success)" /> };
    if (lifetimeSubjects.length > 0) {
        const weakest = lifetimeSubjects[lifetimeSubjects.length - 1];
        if (weakest.avg < 60) {
            nextAction = {
                title: `Review ${weakest.name}`,
                desc: `Your lifetime average in ${weakest.name} is ${weakest.avg}%. Focus your next study session here.`,
                icon: <AlertCircle size={20} color="var(--danger)" />
            };
        } else if (trendDiff < 0) {
            nextAction = {
                title: "Reassess recent topics",
                desc: "Your recent scores have dipped. Review your latest incorrect answers.",
                icon: <AlertCircle size={20} color="var(--warning)" />
            };
        }
    }

    // --- SVG Chart Calculations ---
    const chartData = sortedResults.slice(-15); // Show up to 15 points
    let pathD = "";
    if (chartData.length > 1) {
        const width = 800;
        const height = 220;
        const stepX = width / (chartData.length - 1);

        const points = chartData.map((r, i) => {
            const pct = (r.score / r.totalQuestions) * 100;
            const x = i * stepX;
            const y = height - ((pct / 100) * (height - 60) + 30); // 30px padding
            return `${x},${y}`;
        });
        pathD = `M ${points.join(' L ')}`;
    }

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 64, fontFamily: 'Inter, system-ui, sans-serif' }}>

            {/* Header */}
            <div style={{ marginBottom: 40 }}>
                <h1 style={{ fontSize: 32, fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>Academic Performance</h1>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Understand your progress, strengths, and areas for improvement.</p>
            </div>

            {/* TOP TIER: Summary Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, marginBottom: 40 }}>
                <div style={{ padding: '24px 32px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Current Average</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <div style={{ fontSize: 36, fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1 }}>{averageScore}%</div>
                    </div>
                </div>

                <div style={{ padding: '24px 32px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Recent Trend</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <div style={{ fontSize: 36, fontWeight: 300, color: trendDiff >= 0 ? 'var(--success)' : 'var(--danger)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {trendDiff >= 0 ? <TrendingUp size={28} /> : <TrendingDown size={28} />}
                            {Math.abs(trendDiff)}%
                        </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>{trendContext}</div>
                </div>

                <div style={{ padding: '24px 32px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Exams Completed</div>
                    <div style={{ fontSize: 36, fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1 }}>{completedExams}</div>
                </div>

                <div style={{ padding: '24px 32px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Personal Best</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <div style={{ fontSize: 36, fontWeight: 300, color: 'var(--text-primary)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Award size={28} color="var(--brand-primary)" /> {Math.round(bestScore)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* MIDDLE TIER: Score Progression & Insights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginBottom: 24, '@media (min-width: 1024px)': { gridTemplateColumns: '2fr 1fr' } }}>

                {/* SVG CHART */}
                <section style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Score Progression</h2>
                    <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 16, padding: '32px 40px', position: 'relative' }}>
                        {chartData.length > 1 ? (
                            <div style={{ width: '100%', height: 260, position: 'relative' }}>
                                {/* Background Grid */}
                                <div style={{ position: 'absolute', top: 30, left: 0, right: 0, borderTop: '1px dashed var(--border-default)', zIndex: 0 }} />
                                <div style={{ position: 'absolute', top: 110, left: 0, right: 0, borderTop: '1px dashed var(--border-default)', zIndex: 0 }} />
                                <div style={{ position: 'absolute', top: 190, left: 0, right: 0, borderTop: '1px dashed var(--border-default)', zIndex: 0 }} />

                                <svg width="100%" height="260" viewBox="0 0 800 260" preserveAspectRatio="none" style={{ overflow: 'visible', zIndex: 1, position: 'relative' }} onMouseLeave={() => setHoveredPoint(null)}>
                                    <path d={pathD} fill="none" stroke="var(--brand-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    {chartData.map((r, i) => {
                                        const pct = Math.round((r.score / r.totalQuestions) * 100);
                                        const x = i * (800 / (chartData.length - 1));
                                        const y = 260 - ((pct / 100) * 200 + 30);
                                        const isHovered = hoveredPoint === i;

                                        // Tooltip bounds calculation
                                        const tooltipX = Math.max(10, Math.min(x - 100, 590));
                                        const tooltipY = Math.max(10, y - 90);

                                        // Hit area width
                                        const hitWidth = 800 / Math.max(1, chartData.length - 1);
                                        const hitX = Math.max(0, x - hitWidth / 2);

                                        return (
                                            <g key={i} className="chart-node">
                                                {/* Invisible hover area spanning full height */}
                                                <rect
                                                    x={hitX}
                                                    y={0}
                                                    width={hitWidth}
                                                    height={260}
                                                    fill="transparent"
                                                    onMouseEnter={() => setHoveredPoint(i)}
                                                    style={{ cursor: 'crosshair' }}
                                                />

                                                {/* Vertical guide line on hover */}
                                                {isHovered && <line x1={x} y1={0} x2={x} y2={260} stroke="var(--border-default)" strokeWidth="1" strokeDasharray="4 4" style={{ pointerEvents: 'none' }} />}

                                                {/* Node */}
                                                <circle cx={x} cy={y} r={isHovered ? "8" : "6"} fill={isHovered ? "var(--brand-primary)" : "var(--bg-base)"} stroke="var(--brand-primary)" strokeWidth={isHovered ? "0" : "2.5"} style={{ transition: 'all 0.2s ease', pointerEvents: 'none' }} />

                                                {/* Label or Tooltip */}
                                                {isHovered ? (
                                                    <foreignObject x={tooltipX} y={tooltipY} width="200" height="100" style={{ pointerEvents: 'none', overflow: 'visible' }}>
                                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '12px 16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', width: 200 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.exam?.title || 'Assessment'}</div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                                                                <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pct}%</span>
                                                            </div>
                                                        </div>
                                                    </foreignObject>
                                                ) : (
                                                    <text x={x} y={y - 16} fill="var(--text-primary)" fontSize="13" fontWeight="600" textAnchor="middle" style={{ pointerEvents: 'none' }}>{pct}%</text>
                                                )}
                                            </g>
                                        )
                                    })}
                                </svg>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, fontSize: 12, color: 'var(--text-tertiary)' }}>
                                    <span>{new Date(chartData[0].createdAt).toLocaleDateString()}</span>
                                    <span>{new Date(chartData[chartData.length - 1].createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ) : (
                            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                                Not enough data to map progression.
                            </div>
                        )}
                    </div>
                </section>

                {/* INSIGHTS MODULE */}
                <section style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Performance Insights</h2>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 16, padding: 32, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                                    <Target size={16} />
                                </div>
                                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Why Your Score Changed</h3>
                            </div>
                            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                                {whyInsight}
                            </p>
                            {whyDetails.map((detail, i) => (
                                <div key={i} style={{ fontSize: 14, color: 'var(--text-primary)', background: 'var(--bg-body)', padding: '12px 16px', borderRadius: 8, marginBottom: 8 }}>
                                    {detail}
                                </div>
                            ))}
                        </div>

                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 16, padding: 32 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                {nextAction.icon}
                                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Next Recommended Action</h3>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{nextAction.title}</div>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{nextAction.desc}</p>
                        </div>

                    </div>
                </section>
            </div>

            {/* LOWER TIER: Subject & Recent Lists */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, '@media (min-width: 1024px)': { gridTemplateColumns: '1fr 2fr' } }}>

                {/* SUBJECT PERFORMANCE */}
                <section style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Subject Mastery</h2>
                    <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 16, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {lifetimeSubjects.length > 0 ? (
                            lifetimeSubjects.map((sub, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 12 }}>
                                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{sub.name}</span>
                                        <span style={{ fontWeight: 600, color: sub.avg >= 80 ? 'var(--success)' : sub.avg >= 60 ? 'var(--warning)' : 'var(--danger)' }}>{sub.avg}%</span>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--bg-body)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${sub.avg}%`, background: 'var(--brand-primary)', borderRadius: 3 }} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No subject data available.</div>
                        )}
                    </div>
                </section>

                {/* RECENT PERFORMANCE LIST */}
                <section style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h2 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Recent Assessments</h2>
                        <button onClick={() => navigate('/student/results')} style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            View Full History <ChevronRight size={14} />
                        </button>
                    </div>

                    <div style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 16, overflow: 'hidden' }}>
                        {reverseResults.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>No past assessments available.</div>
                        ) : (
                            reverseResults.slice(0, 6).map((r, i) => {
                                const pct = Math.round((r.score / r.totalQuestions) * 100);
                                const grade = getGrade(pct);
                                return (
                                    <div key={r._id} style={{ display: 'flex', alignItems: 'center', padding: '20px 32px', borderBottom: i !== Math.min(reverseResults.length, 6) - 1 ? '1px solid var(--border-default)' : 'none', cursor: 'pointer', transition: 'background 0.2s' }} className="table-row-hover" onClick={() => navigate('/student/results')}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>{r.exam?.title || 'Deleted Exam'}</div>
                                            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-tertiary)' }}>
                                                <span>{new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                <span>{r.totalQuestions} Questions</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 18, fontWeight: 400, color: 'var(--text-primary)' }}>{pct}%</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Score</div>
                                            </div>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: grade.color + '15', color: grade.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 16 }}>
                                                {grade.letter}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </section>

            </div>

        </div>
    );
};

export default StudentPerformancePage;
