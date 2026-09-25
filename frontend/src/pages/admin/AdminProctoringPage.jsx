import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AdminLayout } from './AdminLayout.jsx';
import { Activity, Video, Mic, MicOff, MonitorPlay, AlertTriangle, Search, Filter, ShieldAlert } from 'lucide-react';

const API = 'http://localhost:4000/api';
const SOCKET_URL = 'http://localhost:4000/proctoring';

const StudentMonitorCard = ({ session, onListen, listeningTo, onOpenDetails }) => {
    const peerConnectionRef = useRef(null);
    const [connecting, setConnecting] = useState(false);

    const isListening = listeningTo === session.studentId._id;
    const isOnline = session.connectionStatus === 'ONLINE';

    return (
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{session.studentId.name}</h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{session.studentId.studentId}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <div className={`status-dot ${isOnline ? 'bg-success' : 'bg-danger'}`} title={session.connectionStatus} />
                </div>
            </div>

            <div style={{ 
                width: '100%', 
                aspectRatio: '4/3', 
                backgroundColor: 'var(--bg-elevated)', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
            }}>
                {session.stream ? (
                    <video 
                        ref={(el) => {
                            if (el && session.stream) {
                                if (el.srcObject !== session.stream) {
                                    el.srcObject = session.stream;
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
                ) : (
                    <div style={{ color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Video size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <span style={{ fontSize: '12px' }}>{session.cameraStatus === 'CONNECTED' ? 'Connecting stream...' : session.cameraStatus}</span>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Video size={14} color={session.cameraStatus === 'CONNECTED' ? 'var(--success)' : 'var(--danger)'} /> 
                    Cam
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {session.microphoneStatus === 'CONNECTED' ? (
                        <Mic size={14} color="var(--success)" />
                    ) : (
                        <MicOff size={14} color="var(--danger)" />
                    )} 
                    Mic
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MonitorPlay size={14} color={session.fullscreenStatus === 'ACTIVE' ? 'var(--success)' : 'var(--danger)'} /> 
                    Full
                </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button 
                    className={`btn ${isListening ? 'btn-primary' : 'btn-outline'}`} 
                    style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                    onClick={() => onListen(session.studentId._id)}
                    disabled={session.microphoneStatus !== 'CONNECTED' || !session.stream}
                >
                    {isListening ? <Mic size={14} style={{ marginRight: 4 }}/> : <MicOff size={14} style={{ marginRight: 4 }}/>}
                    {isListening ? 'Listening' : 'Listen'}
                </button>
                <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                    onClick={() => onOpenDetails(session)}
                >
                    Details
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
        newSocket.on('proctoring:offer', async ({ fromStudentSocketId, studentId, offer }) => {
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
                const stream = event.streams[0];
                
                setSessions(prev => prev.map(s => {
                    if (String(s.studentId._id) === String(studentId)) {
                        return { ...s, stream };
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
                if (session.connectionStatus === 'ONLINE' && session.socketId && !session.stream) {
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    <div className="card stat-card">
                        <div className="stat-label">Active Students</div>
                        <div className="stat-value">{summary.total}</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-label">Online</div>
                        <div className="stat-value" style={{ color: 'var(--success)' }}>{summary.online}</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-label">Unstable / Offline</div>
                        <div className="stat-value" style={{ color: 'var(--warning)' }}>{summary.unstable + summary.offline}</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-label">Pending Incidents</div>
                        <div className="stat-value" style={{ color: 'var(--danger)' }}>{summary.pendingIncidents}</div>
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
                            <h2 style={{ margin: 0 }}>{selectedSession.studentId.name} Monitoring Details</h2>
                            <button className="btn btn-outline" onClick={() => setSelectedSession(null)}>Close</button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <h4>Session Info</h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-secondary)' }}>
                                    <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}><strong>Exam:</strong> {selectedSession.examId.title}</li>
                                    <li style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}><strong>Student ID:</strong> {selectedSession.studentId.studentId}</li>
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

                        {selectedSession.stream && (
                            <div style={{ marginTop: '24px' }}>
                                <h4>Live Feed</h4>
                                <video 
                                    ref={(ref) => { if (ref) ref.srcObject = selectedSession.stream; }}
                                    autoPlay 
                                    playsInline 
                                    muted={listeningTo !== selectedSession.studentId._id}
                                    style={{ width: '100%', borderRadius: '8px', backgroundColor: '#000' }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};
