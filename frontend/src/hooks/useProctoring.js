import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:4000/proctoring';

export const useProctoring = (examId, isStarted) => {
    const [socket, setSocket] = useState(null);
    const [stream, setStream] = useState(null);
    const [cameraStatus, setCameraStatus] = useState('UNKNOWN');
    const [microphoneStatus, setMicrophoneStatus] = useState('UNKNOWN');
    const [proctoringSessionId, setProctoringSessionId] = useState(null);
    
    const peerConnectionRef = useRef(null);
    const socketRef = useRef(null);

    // Initialize Media
    useEffect(() => {
        if (!isStarted) return;

        let activeStream = null;
        let isMounted = true;

        const initMedia = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                
                if (!isMounted) {
                    // If component unmounted before promise resolved, stop the tracks immediately
                    s.getTracks().forEach(t => t.stop());
                    return;
                }

                activeStream = s;
                setStream(s);
                setCameraStatus('CONNECTED');
                setMicrophoneStatus('CONNECTED');
            } catch (err) {
                if (!isMounted) return;
                console.error("Failed to get media devices:", err);
                if (err.name === 'NotAllowedError') {
                    setCameraStatus('PERMISSION_DENIED');
                    setMicrophoneStatus('PERMISSION_DENIED');
                } else if (err.name === 'NotFoundError') {
                    setCameraStatus('NOT_FOUND');
                    setMicrophoneStatus('NOT_FOUND');
                } else {
                    setCameraStatus('DEVICE_ERROR');
                    setMicrophoneStatus('DEVICE_ERROR');
                }
            }
        };

        initMedia();

        return () => {
            isMounted = false;
            if (activeStream) {
                activeStream.getTracks().forEach(t => t.stop());
            }
        };
    }, [isStarted]);

    const statusRefs = useRef({ cameraStatus, microphoneStatus });

    // Keep refs in sync with state for the heartbeat closure
    useEffect(() => {
        statusRefs.current = { cameraStatus, microphoneStatus };
    }, [cameraStatus, microphoneStatus]);

    // Initialize Socket and WebRTC
    useEffect(() => {
        if (!isStarted || !stream) return;

        const token = localStorage.getItem('studentToken');
        if (!token) return;

        const newSocket = io(SOCKET_URL, {
            auth: { token }
        });
        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log("Connected to Proctoring Socket");
            newSocket.emit('proctoring:join', { examId });
        });

        newSocket.on('proctoring:session-ready', ({ sessionId }) => {
            setProctoringSessionId(sessionId);
        });

        // Periodic Heartbeat
        const heartbeatInterval = setInterval(() => {
            newSocket.emit('proctoring:heartbeat', {
                cameraStatus: statusRefs.current.cameraStatus,
                microphoneStatus: statusRefs.current.microphoneStatus,
                fullscreenStatus: document.fullscreenElement ? 'ACTIVE' : 'INACTIVE'
            });
        }, 10000);

        // WebRTC Signaling
        newSocket.on('proctoring:stream-requested', async ({ adminSocketId }) => {
            console.log("Admin requested stream", adminSocketId);
            
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            peerConnectionRef.current = pc;

            // Add local tracks to peer connection
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    newSocket.emit('proctoring:ice-candidate', { targetSocketId: adminSocketId, candidate: event.candidate });
                }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            newSocket.emit('proctoring:offer', { targetSocketId: adminSocketId, offer });
        });

        newSocket.on('proctoring:answer', async ({ fromAdminSocketId, answer }) => {
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        newSocket.on('proctoring:ice-candidate', async ({ fromAdminSocketId, candidate }) => {
            if (peerConnectionRef.current) {
                try {
                    await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding ice candidate on student side", e);
                }
            }
        });
        
        newSocket.on('proctoring:monitoring-stopped', () => {
            console.log("Admin stopped monitoring");
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }
        });

        setSocket(newSocket);

        return () => {
            clearInterval(heartbeatInterval);
            newSocket.emit('proctoring:leave');
            newSocket.disconnect();
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
        };
    }, [isStarted, examId, stream]);

    const reportIncident = useCallback((type, severity, description, details) => {
        if (socketRef.current) {
            socketRef.current.emit('proctoring:event', { type, severity, description, details });
        }
    }, []);

    return {
        stream,
        cameraStatus,
        microphoneStatus,
        reportIncident
    };
};
