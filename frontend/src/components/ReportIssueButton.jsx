import React, { useState } from 'react';
import axios from 'axios';
import { HelpCircle, Send, CheckCircle2, Clock, FileText, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import './ReportIssueButton.css';

export const ReportIssueButton = ({ contextData = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [category, setCategory] = useState('Bug');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Low');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    
    // History Tracking
    const [activeTab, setActiveTab] = useState('report');
    const [myReports, setMyReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    const fetchMyReports = async () => {
        setLoadingReports(true);
        try {
            const token = localStorage.getItem('studentToken') 
                       || localStorage.getItem('profToken') 
                       || localStorage.getItem('auditorToken')
                       || localStorage.getItem('adminToken');
                       
            if (!token) return;

            const res = await axios.get('/api/feedback/my', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMyReports(res.data.feedback || []);
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setLoadingReports(false);
        }
    };

    React.useEffect(() => {
        if (isOpen && activeTab === 'history') {
            fetchMyReports();
        }
    }, [isOpen, activeTab]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let token = null;
            const path = window.location.pathname;
            if (path.startsWith('/admin')) token = localStorage.getItem('adminToken');
            else if (path.startsWith('/professor')) token = localStorage.getItem('profToken');
            else if (path.startsWith('/student')) token = localStorage.getItem('studentToken');
            else if (path.startsWith('/auditor')) token = localStorage.getItem('auditorToken');
            
            if (!token) {
                token = localStorage.getItem('studentToken') 
                     || localStorage.getItem('profToken') 
                     || localStorage.getItem('auditorToken')
                     || localStorage.getItem('adminToken');
            }
                       
            if (!token) {
                alert("You must be logged in to report an issue.");
                return;
            }

            await axios.post('/api/feedback/submit', {
                category,
                subject,
                description,
                priority,
                context: {
                    page: window.location.pathname,
                    ...contextData
                }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccess(true);
            setTimeout(() => {
                setIsOpen(false);
                setSuccess(false);
                setSubject('');
                setDescription('');
            }, 3000);
        } catch (error) {
            console.error("Failed to submit report:", error);
            alert("Failed to submit the report. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <button 
                className="report-issue-fab" 
                onClick={() => setIsOpen(true)}
                title="Report an Issue / Feedback"
            >
                <HelpCircle size={24} />
            </button>

            <Modal
                open={isOpen}
                onClose={() => setIsOpen(false)}
                title={success ? "" : "Feedback & Support"}
                size="md"
            >
                {!success && (
                    <div style={{ display: 'flex', gap: 16, marginBottom: 20, borderBottom: '1px solid var(--border-default)' }}>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('report')}
                            style={{ 
                                background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer',
                                fontSize: 14, fontWeight: 600, color: activeTab === 'report' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                borderBottom: activeTab === 'report' ? '2px solid var(--brand-primary)' : '2px solid transparent',
                                marginBottom: -1
                            }}
                        >
                            Report Issue
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('history')}
                            style={{ 
                                background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer',
                                fontSize: 14, fontWeight: 600, color: activeTab === 'history' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                borderBottom: activeTab === 'history' ? '2px solid var(--brand-primary)' : '2px solid transparent',
                                marginBottom: -1
                            }}
                        >
                            My Reports
                        </button>
                    </div>
                )}

                {success ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '2px solid var(--success)' }}>
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: 18 }}>Report Submitted</h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Thank you for your feedback. Our team will look into it.</p>
                        <button 
                            className="btn btn-secondary" 
                            style={{ marginTop: 24 }}
                            onClick={() => { setSuccess(false); setActiveTab('history'); fetchMyReports(); }}
                        >
                            View My Reports
                        </button>
                    </div>
                ) : activeTab === 'report' ? (
                    <form onSubmit={handleSubmit} id="report-issue-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '4px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Category</label>
                            <select 
                                className="form-select" 
                                value={category} 
                                onChange={e => setCategory(e.target.value)}
                            >
                                <option value="Bug">Bug / Technical Issue</option>
                                <option value="Feature Request">Feature Request</option>
                                <option value="Exam Content">Exam Content Issue</option>
                                <option value="Other">Other Feedback</option>
                            </select>
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Subject</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Brief summary of the issue"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Description</label>
                            <textarea 
                                className="form-textarea" 
                                placeholder="Please provide details about what went wrong or what you'd like to suggest..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={4}
                                required
                            ></textarea>
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Priority</label>
                            <select 
                                className="form-select" 
                                value={priority} 
                                onChange={e => setPriority(e.target.value)}
                            >
                                <option value="Low">Low - Minor issue</option>
                                <option value="Medium">Medium - Annoying but usable</option>
                                <option value="High">High - Core feature broken</option>
                                <option value="Critical">Critical - Cannot proceed</option>
                            </select>
                        </div>
                        
                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={isSubmitting}
                            style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
                        >
                            {isSubmitting ? 'Submitting...' : (
                                <>
                                    <Send size={16} /> Submit Report
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 300, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
                        {loadingReports ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading your reports...</div>
                        ) : myReports.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <FileText size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                                <div>You haven't submitted any reports yet.</div>
                            </div>
                        ) : (
                            myReports.map(report => (
                                <div key={report._id} style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                    <div 
                                        onClick={() => setExpandedId(expandedId === report._id ? null : report._id)}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-panel)', cursor: 'pointer' }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{report.subject}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12}/> {report.priority}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <StatusBadge status={report.status} />
                                            {expandedId === report._id ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}
                                        </div>
                                    </div>
                                    
                                    {expandedId === report._id && (
                                        <div style={{ padding: 16, background: 'var(--bg-default)', borderTop: '1px solid var(--border-default)' }}>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                                                {report.description}
                                            </div>
                                            
                                            {report.adminResponse && (
                                                <div style={{ 
                                                    marginTop: 16, 
                                                    padding: 12, 
                                                    background: report.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.05)' : 'var(--brand-primary-subtle)', 
                                                    borderLeft: `3px solid ${report.status === 'RESOLVED' ? 'var(--success)' : 'var(--brand-primary)'}`,
                                                    borderRadius: '0 4px 4px 0'
                                                }}>
                                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>
                                                        {report.status === 'RESOLVED' ? 'Resolution details' : 'Admin Response'}
                                                    </div>
                                                    <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                                        {report.adminResponse}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </Modal>
        </>
    );
};
