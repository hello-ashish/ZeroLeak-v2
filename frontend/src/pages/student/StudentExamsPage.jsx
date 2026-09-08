import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Filter, PlayCircle, CheckCircle2, Clock, Calendar, FileText } from 'lucide-react';

const StudentExamsPage = () => {
    const [exams, setExams] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Available');
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

    const takenExamIds = new Set(results.map(r => r.exam?._id));

    const getFilteredExams = () => {
        let filtered = exams.filter(e => {
            if (activeTab === 'Available') return !takenExamIds.has(e._id);
            if (activeTab === 'Completed') return takenExamIds.has(e._id);
            return true;
        });

        if (searchQuery) {
            filtered = filtered.filter(e => 
                e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                e.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    };

    const filteredExams = getFilteredExams();

    if (loading) {
        return (
            <div style={{ padding: 32 }}>
                <div style={{ height: 40, width: 200, background: 'var(--bg-card)', borderRadius: 8, marginBottom: 32, animation: 'pulse 2s infinite' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[1,2,3].map(i => <div key={i} style={{ height: 120, background: 'var(--bg-card)', borderRadius: 12, animation: 'pulse 2s infinite' }} />)}
                </div>
            </div>
        );
    }

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
                {['Available', 'Completed', 'All'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            padding: '0 0 16px', 
                            fontSize: 14, 
                            fontWeight: activeTab === tab ? 600 : 500, 
                            color: activeTab === tab ? 'var(--brand-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === tab ? '2px solid var(--brand-primary)' : '2px solid transparent',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

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
                    filteredExams.map(exam => {
                        const isTaken = takenExamIds.has(exam._id);
                        return (
                            <div key={exam._id} className="card" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'transform 0.2s ease, border-color 0.2s ease', borderLeft: isTaken ? '4px solid var(--success)' : '4px solid var(--brand-primary)' }}>
                                <div style={{ flex: 1, paddingRight: 32 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{exam.title}</h3>
                                        {isTaken ? (
                                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', background: 'var(--success-subtle)', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> Completed</span>
                                        ) : (
                                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-primary)', background: 'var(--bg-body)', padding: '2px 8px', borderRadius: 12, border: '1px solid var(--border-default)' }}>Available</span>
                                        )}
                                    </div>
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>{exam.description}</p>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 13, color: 'var(--text-tertiary)' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> {exam.durationMinutes} mins</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> {exam.questions?.length || 0} Questions</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> Created: {new Date(exam.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                
                                <div>
                                    {isTaken ? (
                                        <button 
                                            onClick={() => navigate('/student/results')}
                                            className="btn btn-secondary"
                                            style={{ padding: '10px 20px', fontSize: 14 }}
                                        >
                                            View Result
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => navigate(`/student/take-exam/${exam._id}`)}
                                            className="btn btn-primary"
                                            style={{ padding: '10px 20px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
                                        >
                                            Start Exam <PlayCircle size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
};

export default StudentExamsPage;
