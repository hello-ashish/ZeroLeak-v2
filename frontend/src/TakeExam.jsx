import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Clock, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, 
    Flag, Maximize2, Minimize2, Edit3, Bookmark, HelpCircle, 
    PanelRightClose, PanelRightOpen, X, Activity, LayoutDashboard 
} from 'lucide-react';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const TakeExam = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Core State
    const [isStarted, setIsStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [markedForReview, setMarkedForReview] = useState(new Set());
    const [confidenceLevels, setConfidenceLevels] = useState({});
    const [scratchpad, setScratchpad] = useState("");
    const [score, setScore] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    
    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [focusMode, setFocusMode] = useState(false);
    const [showPreSubmit, setShowPreSubmit] = useState(false);
    const [saveStatus, setSaveStatus] = useState("Saved");
    const [toolsOpen, setToolsOpen] = useState(false); // Collapsible right drawer

    const timerRef = useRef(null);
    const sessionKey = `zl_exam_session_${id}`;

    // Load Exam Data
    useEffect(() => {
        const fetchExam = async () => {
            try {
                const token = localStorage.getItem('studentToken');
                if (!token) return navigate('/student/login');

                const response = await axios.get(`http://localhost:4000/api/students/exams/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const fetchedExam = response.data.exam;

                // Check if already taken
                const resultsRes = await axios.get(`http://localhost:4000/api/students/results`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const alreadyTaken = resultsRes.data.results?.some(r => (r.exam?._id === id || r.exam === id));
                
                if (alreadyTaken) {
                    alert("You have already completed this exam.");
                    return navigate('/student/exams');
                }

                setExam(fetchedExam);

                const savedSession = localStorage.getItem(sessionKey);
                if (savedSession) {
                    try {
                        const parsed = JSON.parse(savedSession);
                        setAnswers(parsed.answers || {});
                        setMarkedForReview(new Set(parsed.markedForReview || []));
                        setConfidenceLevels(parsed.confidenceLevels || {});
                        setScratchpad(parsed.scratchpad || "");
                        setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
                        if (parsed.timeLeft > 0) {
                            setTimeLeft(parsed.timeLeft);
                            setIsStarted(true);
                        }
                    } catch (e) {
                        console.error("Failed to restore session", e);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch exam", error);
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [id, navigate, sessionKey]);

    const handleAutoSubmit = useCallback(() => {
        submitExamData();
    }, [answers, exam]);

    // Timer Logic
    useEffect(() => {
        if (isStarted && score === null && exam && timeLeft === null) {
            setTimeLeft(exam.durationMinutes * 60);
        }
    }, [isStarted, exam, score, timeLeft]);

    useEffect(() => {
        if (timeLeft !== null && timeLeft > 0 && score === null) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        handleAutoSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [timeLeft, score, handleAutoSubmit]);

    // Auto-Save UI Logic
    useEffect(() => {
        if (!isStarted || score !== null) return;
        setSaveStatus("Saving...");
        const timeout = setTimeout(() => setSaveStatus("Saved"), 800);
        return () => clearTimeout(timeout);
    }, [answers, markedForReview, confidenceLevels, scratchpad, currentQuestionIndex, isStarted, score]);

    // Data Persistence Logic
    useEffect(() => {
        if (isStarted && score === null) {
            const sessionData = {
                answers,
                markedForReview: Array.from(markedForReview),
                confidenceLevels,
                scratchpad,
                currentQuestionIndex,
                timeLeft
            };
            localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        }
    }, [answers, markedForReview, confidenceLevels, scratchpad, currentQuestionIndex, timeLeft, isStarted, score, sessionKey]);

    // Keyboard Navigation
    useEffect(() => {
        if (!isStarted || score !== null || showPreSubmit || !exam) return;

        const handleKeyDown = (e) => {
            // Don't trigger if user is typing in scratchpad
            if (e.target.tagName.toLowerCase() === 'textarea' || e.target.tagName.toLowerCase() === 'input') return;

            const key = e.key.toLowerCase();
            const currentQ = exam.questions[currentQuestionIndex];

            // Next / Prev
            if (key === 'n' && currentQuestionIndex < exam.questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
            }
            if (key === 'p' && currentQuestionIndex > 0) {
                setCurrentQuestionIndex(prev => prev - 1);
            }
            // Mark for Review
            if (key === 'r') {
                toggleMarkForReview(currentQ._id);
            }
            // Options A-F / 1-6
            const optionMap = { 'a': 0, '1': 0, 'b': 1, '2': 1, 'c': 2, '3': 2, 'd': 3, '4': 3, 'e': 4, '5': 4, 'f': 5, '6': 5 };
            if (optionMap[key] !== undefined && optionMap[key] < currentQ.options.length) {
                handleOptionSelect(currentQ._id, optionMap[key]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isStarted, score, showPreSubmit, currentQuestionIndex, exam, markedForReview, answers]);

    const formatTime = (seconds) => {
        if (seconds === null) return "--:--";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleOptionSelect = (questionId, optionIndex) => {
        if (score !== null) return;
        setAnswers({ ...answers, [questionId]: optionIndex });
    };

    const clearAnswer = (questionId) => {
        const newAnswers = { ...answers };
        delete newAnswers[questionId];
        setAnswers(newAnswers);
    };

    const toggleMarkForReview = (questionId) => {
        const newSet = new Set(markedForReview);
        if (newSet.has(questionId)) newSet.delete(questionId);
        else newSet.add(questionId);
        setMarkedForReview(newSet);
    };

    const setConfidence = (questionId, level) => {
        setConfidenceLevels({ ...confidenceLevels, [questionId]: level });
    };

    const submitExamData = async () => {
        setIsSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);
        try {
            const token = localStorage.getItem('studentToken');
            const response = await axios.post('http://localhost:4000/api/students/results', {
                examId: exam._id,
                answers: Object.entries(answers).map(([questionId, selectedOptionIndex]) => ({
                    questionId,
                    selectedOptionIndex
                }))
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            setScore(response.data.result.score);
            localStorage.removeItem(sessionKey);
            setShowPreSubmit(false);
        } catch (error) {
            console.error("Failed to submit exam result", error);
            alert("Failed to save results. Please check your connection.");
            setIsSubmitting(false);
        }
    };

    const confirmSubmission = () => {
        submitExamData();
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
                <div style={{ width: 40, height: 40, border: '3px solid var(--border-default)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (!exam) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Exam Not Found</div>;

    // --- SCREEN: RESULTS (Post-Submission) ---
    if (score !== null) {
        const pct = Math.round((score / exam.questions.length) * 100);
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 24 }}>
                <div style={{ maxWidth: 480, width: '100%', textAlign: 'center', animation: 'slideIn 0.3s ease-out' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-subtle)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <CheckCircle2 size={32} />
                    </div>
                    <h2 style={{ fontSize: 28, fontWeight: 300, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.02em' }}>Submission Successful</h2>
                    <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 40 }}>Your examination has been recorded and finalized.</p>
                    
                    <div style={{ padding: 32, borderRadius: 16, border: '1px solid var(--border-default)', marginBottom: 40, background: 'var(--bg-card)' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Final Performance</p>
                        <div style={{ fontSize: 56, fontWeight: 300, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{pct}%</div>
                        <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 16 }}>{score} correct out of {exam.questions.length}</div>
                    </div>

                    <button onClick={() => navigate('/student/dashboard')} className="btn btn-secondary" style={{ width: '100%', padding: '16px', fontSize: 15, borderRadius: 12 }}>
                        Return to Command Center
                    </button>
                </div>
            </div>
        );
    }

    // --- SCREEN: BRIEFING ---
    if (!isStarted) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ maxWidth: 640, width: '100%', background: 'var(--bg-card)', padding: 48, borderRadius: 24, border: '1px solid var(--border-default)' }}>
                    <div style={{ marginBottom: 40 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>ZeroLeak Assessment</div>
                        <h1 style={{ fontSize: 32, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 16, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{exam.title}</h1>
                        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{exam.description}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
                        <div style={{ background: 'var(--bg-body)', padding: 24, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><Clock size={20} /></div>
                            <div>
                                <div style={{ fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1 }}>{exam.durationMinutes}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Minutes</div>
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-body)', padding: 24, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}><LayoutDashboard size={20} /></div>
                            <div>
                                <div style={{ fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1 }}>{exam.questions.length}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Questions</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <button onClick={() => navigate('/student/dashboard')} className="btn btn-secondary" style={{ flex: 1, padding: '16px', borderRadius: 12 }}>Cancel</button>
                        <button onClick={() => setIsStarted(true)} className="btn btn-primary" style={{ flex: 2, padding: '16px', fontSize: 16, borderRadius: 12 }}>Begin Assessment</button>
                    </div>
                </div>
            </div>
        );
    }

    // --- SCREEN: PRE-SUBMISSION CONFIRMATION ---
    if (showPreSubmit) {
        const answeredCount = Object.keys(answers).length;
        const unansweredCount = exam.questions.length - answeredCount;
        const markedCount = markedForReview.size;

        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '40px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ maxWidth: 540, width: '100%', background: 'var(--bg-card)', padding: 48, borderRadius: 24, border: '1px solid var(--border-default)', animation: 'slideIn 0.2s ease-out' }}>
                    <div style={{ textAlign: 'center', marginBottom: 40 }}>
                        <h2 style={{ fontSize: 28, fontWeight: 300, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.02em' }}>Ready to Submit?</h2>
                        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Please review your examination status before finalizing.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--bg-body)', borderRadius: 12 }}>
                            <span style={{ fontSize: 15, color: 'var(--text-secondary)' }}>Answered</span>
                            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>{answeredCount} / {exam.questions.length}</span>
                        </div>
                        {unansweredCount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--warning-subtle)', borderRadius: 12 }}>
                                <span style={{ fontSize: 15, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={18} /> Unanswered</span>
                                <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--warning)' }}>{unansweredCount}</span>
                            </div>
                        )}
                        {markedCount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--bg-body)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
                                <span style={{ fontSize: 15, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: 8 }}><Bookmark size={18} /> Marked for Review</span>
                                <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--brand-primary)' }}>{markedCount}</span>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {unansweredCount > 0 && (
                            <button onClick={() => {
                                const firstUnanswered = exam.questions.findIndex(q => answers[q._id] === undefined);
                                if (firstUnanswered !== -1) {
                                    setCurrentQuestionIndex(firstUnanswered);
                                    setShowPreSubmit(false);
                                }
                            }} className="btn btn-secondary" style={{ width: '100%', padding: '16px', borderRadius: 12 }}>
                                Jump to First Unanswered
                            </button>
                        )}
                        <button onClick={() => setShowPreSubmit(false)} className="btn btn-secondary" style={{ width: '100%', padding: '16px', borderRadius: 12 }}>
                            Return to Assessment
                        </button>
                        <button onClick={confirmSubmission} disabled={isSubmitting} className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: 16, marginTop: 8, border: 'none', borderRadius: 12 }}>
                            Confirm Final Submission
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- SCREEN: IN-PROGRESS WORKSPACE ---
    const q = exam.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === exam.questions.length - 1;
    const isFirstQuestion = currentQuestionIndex === 0;
    const isAnswered = answers[q._id] !== undefined;
    const isMarked = markedForReview.has(q._id);

    const answeredCount = Object.keys(answers).length;
    const remainingQuestions = exam.questions.length - answeredCount;

    // Exam Pulse Intelligence
    let pulseState = { text: "Optimal Pacing", color: 'var(--text-tertiary)', icon: <Activity size={14} /> };
    if (timeLeft < 300) {
        pulseState = { text: "Time Critical", color: 'var(--danger)', icon: <Clock size={14} /> };
    } else if (remainingQuestions > 0 && timeLeft > 0) {
        const secondsPerQuestion = timeLeft / remainingQuestions;
        const mins = Math.floor(secondsPerQuestion / 60);
        const secs = Math.floor(secondsPerQuestion % 60);
        pulseState = { text: `~${mins > 0 ? mins + 'm ' : ''}${secs}s / remaining`, color: 'var(--text-tertiary)', icon: <Activity size={14} /> };
    } else if (remainingQuestions === 0) {
        pulseState = { text: "All Answered", color: 'var(--success)', icon: <CheckCircle2 size={14} /> };
    }

    return (
        <div style={{ height: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Global Progress Line */}
            <div style={{ height: 2, background: 'var(--bg-body)', width: '100%', zIndex: 50 }}>
                <div style={{ height: '100%', background: 'var(--brand-primary)', width: `${(answeredCount / exam.questions.length) * 100}%`, transition: 'width 0.3s ease' }} />
            </div>

            {/* Topbar */}
            <header style={{ height: 64, background: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, zIndex: 10 }}>
                {/* Left: Branding & Focus Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 4, background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/logo.png" alt="ZL" style={{ width: 14, height: 14, objectFit: 'cover', filter: 'invert(1)' }} />
                        </div>
                        <h1 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>{exam.title}</h1>
                    </div>
                    
                    <div style={{ width: 1, height: 16, background: 'var(--border-default)' }} />
                    
                    <button onClick={() => setFocusMode(!focusMode)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {focusMode ? "Exit Focus" : "Focus Mode"}
                    </button>
                </div>

                {/* Right: State & Tools */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    
                    {/* Exam Pulse */}
                    <div style={{ display: 'none', '@media (min-width: 1024px)': { display: 'flex' }, alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: pulseState.color, background: 'var(--bg-body)', padding: '4px 10px', borderRadius: 12 }}>
                        {pulseState.icon} {pulseState.text}
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {saveStatus === "Saved" ? <CheckCircle2 size={12} style={{color: 'var(--success)'}}/> : <Activity size={12}/>} {saveStatus}
                    </div>
                    
                    {/* Timer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: timeLeft < 300 ? 'var(--danger)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', fontWeight: 500, fontSize: 15 }}>
                        <Clock size={16} /> {formatTime(timeLeft)}
                    </div>
                    
                    <div style={{ width: 1, height: 16, background: 'var(--border-default)' }} />

                    <button onClick={() => setToolsOpen(!toolsOpen)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: toolsOpen ? 'var(--brand-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                        {toolsOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />} Tools
                    </button>

                    <button onClick={() => setShowPreSubmit(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13, border: 'none', borderRadius: 8 }}>
                        Review & Submit
                    </button>
                </div>
            </header>

            {/* 3-Zone Workspace */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                
                {/* ZONE 1: Navigation Map (Left) */}
                <aside style={{ 
                    width: 240, 
                    background: 'var(--bg-card)', 
                    borderRight: '1px solid var(--border-default)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    overflowY: 'auto',
                    transition: 'margin-left 0.3s ease',
                    marginLeft: focusMode ? -240 : 0,
                    flexShrink: 0
                }}>
                    <div style={{ padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Question Map</h3>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{answeredCount}/{exam.questions.length}</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {exam.questions.map((question, i) => {
                                const answered = answers[question._id] !== undefined;
                                const marked = markedForReview.has(question._id);
                                const current = i === currentQuestionIndex;
                                
                                return (
                                    <button
                                        key={question._id}
                                        onClick={() => setCurrentQuestionIndex(i)}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '8px 12px',
                                            borderRadius: 6,
                                            fontSize: 13,
                                            fontWeight: current ? 500 : 400,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            background: current ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                            color: current ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                            border: 'none',
                                            transition: 'all 0.1s ease'
                                        }}
                                        className={!current ? "table-row-hover" : ""}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ fontSize: 12, color: current ? 'var(--brand-primary)' : 'var(--text-tertiary)', width: 20 }}>{String(i + 1).padStart(2, '0')}</span>
                                            {answered ? (
                                                <CheckCircle2 size={14} style={{ color: current ? 'var(--brand-primary)' : 'var(--text-tertiary)' }} />
                                            ) : (
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-default)', marginLeft: 4 }} />
                                            )}
                                        </div>
                                        {marked && <Bookmark size={12} style={{ color: 'var(--warning)' }} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* ZONE 2: Main Workspace (Center) */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'var(--bg-base)', paddingRight: toolsOpen ? 340 : 0, transition: 'padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    <div style={{ flex: 1, padding: '48px 40px', maxWidth: 840, margin: '0 auto', width: '100%', transition: 'max-width 0.3s ease' }}>
                        
                        {/* Question Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                                    Question {String(currentQuestionIndex + 1).padStart(2, '0')} of {exam.questions.length}
                                </div>
                                {isMarked && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--warning)', background: 'var(--warning-subtle)', padding: '4px 8px', borderRadius: 4 }}>
                                    <Bookmark size={12} fill="currentColor" /> Marked for Review
                                </div>}
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                {isAnswered && (
                                    <button onClick={() => clearAnswer(q._id)} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <X size={14} /> Clear Selection
                                    </button>
                                )}
                                <button 
                                    onClick={() => toggleMarkForReview(q._id)}
                                    style={{ background: 'none', border: 'none', fontSize: 13, color: isMarked ? 'var(--warning)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    <Bookmark size={16} /> {isMarked ? 'Unmark' : 'Mark for Review'}
                                </button>
                            </div>
                        </div>

                        {/* Question Text */}
                        <h2 style={{ fontSize: 28, fontWeight: 400, color: 'var(--text-primary)', marginBottom: 48, lineHeight: 1.5, letterSpacing: '-0.01em' }}>
                            {q.title}
                        </h2>

                        {/* Answer Options */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 64 }}>
                            {q.options.map((opt, optIndex) => {
                                const isSelected = answers[q._id] === optIndex;
                                const letter = LETTERS[optIndex] || String(optIndex + 1);
                                
                                return (
                                    <div 
                                        key={optIndex}
                                        onClick={() => handleOptionSelect(q._id, optIndex)}
                                        style={{ 
                                            padding: '16px 24px', 
                                            background: isSelected ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-card)', 
                                            border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                                            borderRadius: 12, 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 24,
                                            transition: 'all 0.15s ease',
                                            boxShadow: isSelected ? '0 0 0 1px var(--brand-primary)' : 'none'
                                        }}
                                        className="table-row-hover"
                                    >
                                        <div style={{ 
                                            width: 28, 
                                            height: 28, 
                                            borderRadius: 6, 
                                            background: isSelected ? 'var(--brand-primary)' : 'var(--bg-body)',
                                            border: isSelected ? 'none' : '1px solid var(--border-default)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: isSelected ? 'white' : 'var(--text-secondary)',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            flexShrink: 0
                                        }}>
                                            {letter}
                                        </div>
                                        <span style={{ fontSize: 16, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.5 }}>{opt}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Confidence Marker */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)' }}>CONFIDENCE (Private)</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {['Low', 'Medium', 'High'].map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setConfidence(q._id, level)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            border: 'none',
                                            background: confidenceLevels[q._id] === level ? 'var(--bg-card)' : 'transparent',
                                            color: confidenceLevels[q._id] === level ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                            boxShadow: confidenceLevels[q._id] === level ? '0 1px 3px rgba(0,0,0,0.1), 0 0 0 1px var(--border-default)' : 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.1s ease'
                                        }}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Navigation */}
                    <div style={{ padding: '24px 40px', borderTop: '1px solid var(--border-default)', background: 'var(--bg-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button 
                            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                            disabled={isFirstQuestion}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, visibility: isFirstQuestion ? 'hidden' : 'visible', padding: '12px 24px', borderRadius: 8, fontSize: 14 }}
                        >
                            <ChevronLeft size={16} /> Previous (P)
                        </button>
                        
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {String(currentQuestionIndex + 1).padStart(2, '0')} / {exam.questions.length}
                        </div>

                        {!isLastQuestion ? (
                            <button 
                                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                className="btn btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 8, fontSize: 14, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}
                            >
                                Next (N) <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button 
                                onClick={() => setShowPreSubmit(true)}
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 8, fontSize: 14, border: 'none' }}
                            >
                                Review & Submit <ChevronRight size={16} />
                            </button>
                        )}
                    </div>
                </main>

                {/* ZONE 3: Tools Drawer (Right) */}
                <aside style={{ 
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    height: '100%',
                    width: 340, 
                    background: 'var(--bg-card)', 
                    borderLeft: '1px solid var(--border-default)', 
                    display: 'flex', 
                    flexDirection: 'column',
                    transform: toolsOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: toolsOpen ? '-10px 0 30px rgba(0,0,0,0.1)' : 'none',
                    zIndex: 20
                }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Contextual Tools</h3>
                        <button onClick={() => setToolsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={16}/></button>
                    </div>

                    <div style={{ padding: 24, borderBottom: '1px solid var(--border-default)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Personal Scratchpad
                            </h4>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(autosaves)</span>
                        </div>
                        <textarea
                            value={scratchpad}
                            onChange={(e) => setScratchpad(e.target.value)}
                            placeholder="Type temporary notes here..."
                            style={{
                                width: '100%',
                                height: 200,
                                background: 'var(--bg-body)',
                                border: '1px solid var(--border-default)',
                                borderRadius: 8,
                                padding: 16,
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                resize: 'none',
                                fontFamily: 'monospace',
                                lineHeight: 1.5
                            }}
                        />
                    </div>

                    <div style={{ padding: 24 }}>
                        <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
                            Review Queue
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-body)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Unanswered</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: remainingQuestions > 0 ? 'var(--warning)' : 'var(--text-tertiary)' }}>{remainingQuestions}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-body)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Marked</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: markedForReview.size > 0 ? 'var(--brand-primary)' : 'var(--text-tertiary)' }}>{markedForReview.size}</span>
                            </div>
                        </div>
                    </div>
                </aside>

            </div>
        </div>
    );
};

export default TakeExam;
