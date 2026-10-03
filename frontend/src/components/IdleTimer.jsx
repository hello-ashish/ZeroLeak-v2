import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export const IdleTimer = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        let timeoutId;

        const handleIdle = async () => {
            try {
                if (localStorage.getItem('studentToken')) {
                    await axios.post('/api/students/logout', {}, { headers: { Authorization: `Bearer ${localStorage.getItem('studentToken')}` } });
                    localStorage.removeItem('studentToken');
                    localStorage.removeItem('studentData');
                    navigate('/student/login');
                } else if (localStorage.getItem('profToken')) {
                    await axios.post('/api/professor/logout', {}, { headers: { Authorization: `Bearer ${localStorage.getItem('profToken')}` } });
                    localStorage.removeItem('profToken');
                    localStorage.removeItem('profData');
                    navigate('/professor/login');
                } else if (localStorage.getItem('adminToken')) {
                    await axios.post('/api/admin/logout', {}, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminData');
                    navigate('/admin/login');
                } else if (localStorage.getItem('auditorToken')) {
                    await axios.post('/api/auditor/logout', {}, { headers: { Authorization: `Bearer ${localStorage.getItem('auditorToken')}` } });
                    localStorage.removeItem('auditorToken');
                    localStorage.removeItem('auditorData');
                    navigate('/auditor/login');
                }
            } catch (err) {
                console.error("Logout error", err);
            }
        };

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(handleIdle, IDLE_TIMEOUT);
        };

        if (!location.pathname.includes('/login') && location.pathname !== '/') {
            window.addEventListener('mousemove', resetTimer);
            window.addEventListener('keydown', resetTimer);
            window.addEventListener('scroll', resetTimer);
            window.addEventListener('click', resetTimer);
            resetTimer();
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            window.removeEventListener('scroll', resetTimer);
            window.removeEventListener('click', resetTimer);
        };
    }, [navigate, location.pathname]);

    return null;
};
