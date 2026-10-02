import React, { useState } from 'react';
import axios from 'axios';
import { HelpCircle, Send, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal.jsx';
import './ReportIssueButton.css';

export const ReportIssueButton = ({ contextData = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [category, setCategory] = useState('Bug');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Low');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Find which token is available
            const token = localStorage.getItem('studentToken') 
                       || localStorage.getItem('professorToken') 
                       || localStorage.getItem('auditorToken')
                       || localStorage.getItem('adminToken');
                       
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
                title={success ? "" : "Report an Issue"}
                size=""
            >
                {success ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '2px solid var(--success)' }}>
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: 18 }}>Report Submitted</h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Thank you for your feedback. Our team will look into it.</p>
                    </div>
                ) : (
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
                )}
            </Modal>
        </>
    );
};
