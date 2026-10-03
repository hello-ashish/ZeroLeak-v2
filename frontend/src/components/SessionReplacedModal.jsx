import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Modal } from './Modal.jsx';
import { AlertTriangle } from 'lucide-react';

export const SessionReplacedModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 401 && error.response.data?.code === 'SESSION_REPLACED') {
                    setIsOpen(true);
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, []);

    const handleLogout = () => {
        // Clear all possible tokens
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        localStorage.removeItem('profToken');
        localStorage.removeItem('profData');
        localStorage.removeItem('studentToken');
        localStorage.removeItem('studentData');
        localStorage.removeItem('auditorToken');
        localStorage.removeItem('auditorData');
        
        setIsOpen(false);
        navigate('/');
    };

    return (
        <Modal 
            open={isOpen} 
            onClose={() => {}} // Force them to click the button
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
                    <AlertTriangle size={20} />
                    Session Terminated
                </div>
            }
            footer={
                <button className="btn btn-primary w-full" onClick={handleLogout}>
                    Return to Login
                </button>
            }
        >
            <div style={{ padding: '8px 0' }}>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Your account has been accessed from another device or browser. To protect your security, this session has been automatically logged out.
                </p>
            </div>
        </Modal>
    );
};
