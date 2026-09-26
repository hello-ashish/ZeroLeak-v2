import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AdminLayout } from './AdminLayout.jsx';
import { Activity, Video, Mic, MicOff, MonitorPlay, AlertTriangle, Search, Filter, ShieldAlert } from 'lucide-react';

const API = 'http://localhost:4000/api';
const SOCKET_URL = 'http://localhost:4000/proctoring';

const pageStyles = `
    .proctor-card {
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.3s ease;
        border: 1px solid var(--border-default);
    }
    .proctor-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
        border-color: var(--border-subtle);
    }
    .pulse-dot {
        animation: pulse 2s infinite;
    }
    @keyframes pulse {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 213, 115, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(46, 213, 115, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(46, 213, 115, 0); }
    }
    .pulse-dot.danger {
        animation: pulse-danger 2s infinite;
    }
    @keyframes pulse-danger {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }
        70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(255, 71, 87, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
    }
    .video-placeholder {
        background: linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%);
        animation: shimmer 3s infinite linear;
        background-size: 200% 200%;
    }
    @keyframes shimmer {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    .stat-card-rich {
        background: linear-gradient(145deg, var(--bg-elevated), var(--bg-surface));
        border: 1px solid var(--border-default);
        border-radius: 12px;
        padding: 24px;
        position: relative;
        overflow: hidden;
    }
    .stat-card-rich::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: radial-gradient(circle at top right, rgba(255,255,255,0.03), transparent 60%);
        pointer-events: none;
    }
`;

const StudentMonitorCard = ({ session, onListen, listeningTo, onOpenDetails }) => {
    const peerConnectionRef = useRef(null);
    const [connecting, setConnecting] = useState(false);

    const isListening = listeningTo === session.studentId?._id;
    const isOnline = session.connectionStatus === 'ONLINE';
    const hasIncidents = session.incidentCount > 0;

    return (
        <div className="card proctor-card" style={{ 
            padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px',
            borderColor: hasIncidents ? 'rgba(255, 71, 87, 0.5)' : undefined,
            boxShadow: hasIncidents ? '0 0 15px rgba(255, 71, 87, 0.15)' : undefined
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', 
                        background: 'var(--brand-primary-subtle)', color: 'var(--brand-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '16px'
                    }}>
                        {session.studentId?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{session.studentId?.name || 'Unknown Student'}</h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>{session.studentId?.studentId || 'N/A'}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '6px', 
                        padding: '4px 8px', borderRadius: '20px', 
                        background: isOnline ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)',
                        border: `1px solid ${isOnline ? 'rgba(46, 213, 115, 0.2)' : 'rgba(255, 71, 87, 0.2)'}`
                    }}>
                        <div className={`status-dot pulse-dot ${!isOnline ? 'danger' : ''}`} style={{ backgroundColor: isOnline ? 'var(--success)' : 'var(--danger)', width: 8, height: 8 }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: isOnline ? 'var(--success)' : 'var(--danger)' }}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>
                    {hasIncidents && (
                        <div style={{ fontSize: '11px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                            <AlertTriangle size={12} /> {session.incidentCount} Incident{session.incidentCount > 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            </div>

            <div className="video-placeholder" style={{ 
                width: '100%', 
                aspectRatio: '16/9', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid var(--border-subtle)'
            }}>
                {session.streams?.screen || session.streams?.camera || session.stream ? (
                    <>
                        <video 
                            ref={(el) => {
                                const mainStream = session.streams?.screen || session.streams?.camera || session.stream;
                                if (el && mainStream) {
                                    if (el.srcObject !== mainStream) {
                                        el.srcObject = mainStream;
                                    }
                                    const playPromise = el.play();
                                    if (playPromise !== undefined) {
                                        playPromise.catch(e => console.error("Auto-play error:", e));
                                    }
                                }
                            }}
                            autoPlay 
                            playsInline 
                            muted={!isListening}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {session.streams?.camera && session.streams?.screen && (
                            <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '25%', aspectRatio: '4/3', borderRadius: '4px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 10 }}>
                                <video 
                                    ref={(el) => {
                                        if (el && session.streams.camera && el.srcObject !== session.streams.camera) {
                                            el.srcObject = session.streams.camera;
                                            el.play().catch(e => console.error("Auto-play error:", e));
                                        }
                                    }}
                                    autoPlay 
                                    playsInline 
                                    muted={true}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' }}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                            width: '48px', height: '48px', borderRadius: '50%', 
                            background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
                            <Video size={24} style={{ opacity: 0.7 }} />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.02em' }}>
                            {session.cameraStatus === 'CONNECTED' ? 'Establishing secure stream...' : 'Camera disconnected'}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    <div style={{ padding: '4px', borderRadius: '4px', background: session.cameraStatus === 'CONNECTED' ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)' }}>
                        <Video size={14} color={session.cameraStatus === 'CONNECTED' ? 'var(--success)' : 'var(--danger)'} /> 
                    </div>
                    Cam
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    <div style={{ padding: '4px', borderRadius: '4px', background: session.microphoneStatus === 'CONNECTED' ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)' }}>
                        {session.microphoneStatus === 'CONNECTED' ? (
                            <Mic size={14} color="var(--success)" />
                        ) : (
                            <MicOff size={14} color="var(--danger)" />
                        )} 
                    </div>
                    Mic
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    <div style={{ padding: '4px', borderRadius: '4px', background: session.fullscreenStatus === 'ACTIVE' ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)' }}>
                        <MonitorPlay size={14} color={session.fullscreenStatus === 'ACTIVE' ? 'var(--success)' : 'var(--danger)'} /> 
                    </div>
                    Screen
                </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                    className={`btn ${isListening ? 'btn-primary' : 'btn-outline'}`} 
                    style={{ flex: 1, padding: '8px', fontSize: '13px', transition: 'all 0.2s', background: isListening ? 'var(--danger)' : undefined, borderColor: isListening ? 'var(--danger)' : undefined, color: isListening ? '#fff' : undefined }}
                    onClick={() => onListen(session.studentId?._id)}
                    disabled={session.microphoneStatus !== 'CONNECTED' || !(session.streams?.screen || session.streams?.camera || session.stream)}
                >
                    {isListening ? <Mic size={16} style={{ marginRight: 6, animation: 'pulse-danger 1.5s infinite' }}/> : <MicOff size={16} style={{ marginRight: 6 }}/>}
                    {isListening ? 'Mute' : 'Listen'}
                </button>
                <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, padding: '8px', fontSize: '13px', transition: 'all 0.2s' }}
                    onClick={() => onOpenDetails(session)}
                >
                    View Details
                </button>
            </div>
        </div>
    );
};

export const AdminProctoringPage = () => {
    const [sessions, setSessions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [exams, setExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState('ALL');
    const [socket, setSocket] = useState(null);
    const [listeningTo, setListeningTo] = useState(null);
    const [selectedSession, setSelectedSession] = useState(null);
    
    // For WebRTC: map of studentId -> { peerConnection, stream }
    const rtcMapRef = useRef(new Map());
    const sessionsRef = useRef(sessions);

    useEffect(() => {
        sessionsRef.current = sessions;
    }, [sessions]);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            window.location.href = '/admin/login';
            return;
        }

        // Fetch initial data
        const fetchData = async () => {
            try {
                const examsRes = await axios.get(`${API}/admin/proctoring/active-exams`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setExams(examsRes.data.exams || []);

                const sessionsRes = await axios.get(`${API}/admin/proctoring/sessions${selectedExam !== 'ALL' ? `?examId=${selectedExam}` : ''}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSessions(sessionsRes.data.sessions || []);
                setSummary(sessionsRes.data.summary || null);
            } catch (err) {
                console.error("Failed to load proctoring data:", err);
            }
        };

        fetchData();

        // Setup Socket
        const newSocket = io(SOCKET_URL, {
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log("Connected to Proctoring Socket");
            newSocket.emit('proctoring:admin-join');
        });

        newSocket.on('proctoring:student-joined', (data) => {
            // refresh data or append
            fetchData();
        });

        newSocket.on('proctoring:student-updated', (data) => {
            setSessions(prev => prev.map(s => {
                if (s._id === data.sessionId) {
                    return { ...s, ...data };
                }
                return s;
            }));
        });

        newSocket.on('proctoring:heartbeat-update', (data) => {
            setSessions(prev => prev.map(s => {
                if (s._id === data.sessionId) {
                    return { 
                        ...s, 
                        lastHeartbeat: data.lastHeartbeat,
                        connectionStatus: data.connectionStatus,
                        cameraStatus: data.cameraStatus,
                        microphoneStatus: data.microphoneStatus,
                        fullscreenStatus: data.fullscreenStatus
                    };
                }
                return s;
            }));
        });

        newSocket.on('proctoring:incident', (data) => {
            // We could show a toast here or update the UI
            fetchData();
        });

        newSocket.on('proctoring:student-left', (data) => {
             setSessions(prev => prev.filter(s => s._id !== data.sessionId));
             if (rtcMapRef.current.has(data.studentId)) {
                 const { peerConnection } = rtcMapRef.current.get(data.studentId);
                 if (peerConnection) peerConnection.close();
                 rtcMapRef.current.delete(data.studentId);
             }
        });

        // WebRTC Signaling
        newSocket.on('proctoring:offer', async ({ fromStudentSocketId, studentId, offer, streamIds }) => {
            console.log("Received WebRTC offer from student:", studentId);
            
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    newSocket.emit('proctoring:ice-candidate', { targetSocketId: fromStudentSocketId, candidate: event.candidate });
                }
            };

            pc.ontrack = (event) => {
                console.log("Received track from student", studentId);
                const trackStream = event.streams[0];
                
                setSessions(prev => prev.map(s => {
                    if (String(s.studentId?._id) === String(studentId)) {
                        const newS = { ...s };
                        if (!newS.streams) newS.streams = { camera: null, screen: null };
                        
                        if (streamIds && trackStream.id === streamIds.camera) {
                            newS.streams.camera = trackStream;
                        } else if (streamIds && trackStream.id === streamIds.screen) {
                            newS.streams.screen = trackStream;
                        } else {
                            // Fallback
                            if (!newS.streams.camera) {
                                newS.streams.camera = trackStream;
                            } else {
                                newS.streams.screen = trackStream;
                            }
                        }
                        return newS;
                    }
                    return s;
                }));
            };

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            newSocket.emit('proctoring:answer', { targetSocketId: fromStudentSocketId, answer });

            rtcMapRef.current.set(studentId, { peerConnection: pc, stream: null });
        });

        newSocket.on('proctoring:ice-candidate', async ({ studentId, candidate }) => {
            if (rtcMapRef.current.has(studentId)) {
                const { peerConnection } = rtcMapRef.current.get(studentId);
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding received ice candidate", e);
                }
            }
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
            rtcMapRef.current.forEach(({ peerConnection }) => {
                if (peerConnection) peerConnection.close();
            });
            rtcMapRef.current.clear();
        };
    }, [selectedExam]);

    // Periodically request streams for all connected students
    useEffect(() => {
        if (!socket) return;
        
        const requestStreams = () => {
            sessionsRef.current.forEach(session => {
                if (session.connectionStatus === 'ONLINE' && session.socketId && !(session.streams?.screen || session.streams?.camera || session.stream)) {
                    socket.emit('proctoring:request-stream', { studentSocketId: session.socketId });
                }
            });
        };

        const interval = setInterval(requestStreams, 5000); // Ask every 5s if we don't have the stream
        requestStreams(); // Initial check

        return () => clearInterval(interval);
    }, [socket]);


    const handleListen = (studentId) => {
        if (listeningTo === studentId) {
            setListeningTo(null); // mute
        } else {
            setListeningTo(studentId);
        }
    };

    return (
        <AdminLayout>
            <div className="page-header">
                <div>
                    <h1 className="page-title"><Activity size={24} style={{ marginRight: 12, color: 'var(--brand-primary)' }} /> Live Proctoring</h1>
                    <p className="page-subtitle">Real-time monitoring and anomaly detection</p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="search-box">
                        <Filter size={16} />
                        <select 
                            value={selectedExam} 
                            onChange={e => setSelectedExam(e.target.value)}
                            style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
                        >
                            <option value="ALL">All Active Exams</option>
                            {exams.map(ex => (
                                <option key={ex._id} value={ex._id}>{ex.title} ({ex.activeStudentCount})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                    <div className="stat-card-rich">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Students</div>
                            <div style={{ padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}><MonitorPlay size={18} color="var(--brand-primary)" /></div>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{summary.total}</div>
                    </div>
                    
                    <div className="stat-card-rich">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Online</div>
                            <div style={{ padding: 8, background: 'rgba(46, 213, 115, 0.1)', borderRadius: 8 }}><Activity size={18} color="var(--success)" /></div>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)' }}>{summary.online}</div>
                    </div>

                    <div className="stat-card-rich">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unstable / Offline</div>
                            <div style={{ padding: 8, background: 'rgba(255, 171, 0, 0.1)', borderRadius: 8 }}><Video size={18} color="var(--warning)" /></div>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--warning)' }}>{summary.unstable + summary.offline}</div>
                    </div>

                    <div className="stat-card-rich">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Incidents</div>
                            <div style={{ padding: 8, background: 'rgba(255, 71, 87, 0.1)', borderRadius: 8 }}><ShieldAlert size={18} color="var(--danger)" /></div>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--danger)' }}>{summary.pendingIncidents}</div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {sessions.map(session => (
                    <StudentMonitorCard 
                        key={session._id} 
                        session={session} 
                        onListen={handleListen} 
                        listeningTo={listeningTo}
                        onOpenDetails={setSelectedSession}
                    />
                ))}
                {sessions.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-elevated)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
                        <MonitorPlay size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                        <h3>No Active Sessions</h3>
                        <p>There are no students currently taking the selected exams.</p>
                    </div>
                )}
            </div>

            {/* Basic Details Modal */}
            {selectedSession && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedSession(null)}>
                    <div className="card" style={{ width: '100%', maxWidth: '800px', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>{selectedSession.studentId?.name || 'Unknown'} Monitoring Details</h2>
                            <button className="btn btn-outline" onClick={() => setSelectedSession(null)}>Close</button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <h4>Session Info</h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-secondary)' }}>
                                    <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}><strong>Exam:</strong> {selectedSession.examId.title}</li>
                                    <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}><strong>Student ID:</strong> {selectedSession.studentId?.studentId || 'N/A'}</li>
                                    <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}><strong>Started At:</strong> {new Date(selectedSession.startedAt).toLocaleString()}</li>
                                    <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}><strong>Connection:</strong> {selectedSession.connectionStatus}</li>
                                </ul>
                            </div>
                            <div>
                                <h4>Security Metrics</h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-secondary)' }}>
                                    <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}><strong>Tab Switches:</strong> {selectedSession.tabSwitchCount}</li>
                                    <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}><strong>Window Blurs:</strong> {selectedSession.windowBlurCount}</li>
                                    <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}><strong>Total Incidents:</strong> {selectedSession.incidentCount}</li>
                                </ul>
                            </div>
                        </div>

                        {(selectedSession.streams?.screen || selectedSession.streams?.camera || selectedSession.stream) && (
                            <div style={{ marginTop: '24px', display: 'flex', gap: '20px' }}>
                                {selectedSession.streams?.screen && (
                                    <div style={{ flex: 1 }}>
                                        <h4>Screen Feed</h4>
                                        <video 
                                            ref={(ref) => { if (ref) ref.srcObject = selectedSession.streams.screen; }}
                                            autoPlay 
                                            playsInline 
                                            muted={listeningTo !== selectedSession.studentId?._id}
                                            style={{ width: '100%', borderRadius: '8px', backgroundColor: '#000' }}
                                        />
                                    </div>
                                )}
                                {(selectedSession.streams?.camera || selectedSession.stream) && (
                                    <div style={{ flex: 1 }}>
                                        <h4>Camera Feed</h4>
                                        <video 
                                            ref={(ref) => { if (ref) ref.srcObject = selectedSession.streams?.camera || selectedSession.stream; }}
                                            autoPlay 
                                            playsInline 
                                            muted={!selectedSession.streams?.screen && listeningTo === selectedSession.studentId?._id ? false : true}
                                            style={{ width: '100%', borderRadius: '8px', backgroundColor: '#000' }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};
