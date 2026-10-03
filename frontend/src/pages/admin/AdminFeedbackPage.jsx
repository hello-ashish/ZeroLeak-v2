import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminLayout } from './AdminLayout.jsx';
import { SkeletonTable } from '../../components/SkeletonLoader.jsx';
import { StatusBadge } from '../../components/StatusBadge.jsx';
import { Modal } from '../../components/Modal.jsx';
import { ScrollText, CheckCircle2, MessageSquare, AlertCircle, X, Search } from 'lucide-react';

export default function AdminFeedbackPage() {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchFeedbacks = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.get('/api/feedback/all', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeedbacks(res.data.feedback || []);
        } catch (error) {
            console.error("Error fetching feedback:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const handleUpdateStatus = async (id, status, adminResponse) => {
        setIsUpdating(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await axios.put(`/api/feedback/${id}`, { status, adminResponse }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setFeedbacks(prev => prev.map(f => f._id === id ? res.data.feedback : f));
            if (selectedFeedback && selectedFeedback._id === id) {
                setSelectedFeedback(res.data.feedback);
                setReplyText('');
            }
        } catch (error) {
            console.error("Error updating feedback:", error);
            alert("Failed to update feedback");
        } finally {
            setIsUpdating(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch(priority) {
            case 'Critical': return 'var(--danger)';
            case 'High': return 'var(--warning)';
            case 'Medium': return 'var(--brand-primary)';
            default: return 'var(--text-secondary)';
        }
    };

    const filteredFeedbacks = feedbacks.filter(f => 
        f.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        f.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="page-header" style={{ marginBottom: 32 }}>
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Reports & Feedback</h1>
                        <p className="page-subtitle">Manage user issues, bug reports, and feedback</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                    <div className="search-input-wrap" style={{ flex: '1 1 300px' }}>
                        <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search reports..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Role</th>
                                <th>Category</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <SkeletonTable rows={5} cols={7} />
                            ) : filteredFeedbacks.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
                                        No reports found.
                                    </td>
                                </tr>
                            ) : (
                                filteredFeedbacks.map(f => (
                                    <tr key={f._id}>
                                        <td style={{ fontWeight: 500 }}>{f.subject}</td>
                                        <td><StatusBadge status={f.role} /></td>
                                        <td>{f.category}</td>
                                        <td style={{ color: getPriorityColor(f.priority), fontWeight: 500 }}>{f.priority}</td>
                                        <td><StatusBadge status={f.status} /></td>
                                        <td>{new Date(f.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedFeedback(f)}>
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal
                open={!!selectedFeedback}
                onClose={() => setSelectedFeedback(null)}
                title="Report Details"
                size="md"
                footer={
                    selectedFeedback && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
                            {selectedFeedback.status !== 'CLOSED' && selectedFeedback.status !== 'RESOLVED' && (
                                <>
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => handleUpdateStatus(selectedFeedback._id, 'IN_PROGRESS', null)}
                                        disabled={isUpdating || selectedFeedback.status === 'IN_PROGRESS'}
                                    >
                                        Mark In Progress
                                    </button>
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={() => handleUpdateStatus(selectedFeedback._id, 'RESOLVED', replyText)}
                                        disabled={isUpdating}
                                    >
                                        Resolve Issue
                                    </button>
                                </>
                            )}
                            {(selectedFeedback.status === 'RESOLVED' || selectedFeedback.status === 'CLOSED') && (
                                <button className="btn btn-secondary" onClick={() => setSelectedFeedback(null)}>
                                    Close
                                </button>
                            )}
                        </div>
                    )
                }
            >
                {selectedFeedback && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <div className="form-label" style={{ marginBottom: 4 }}>Subject</div>
                            <div style={{ fontWeight: 500 }}>{selectedFeedback.subject}</div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <div className="form-label" style={{ marginBottom: 4 }}>Reported By</div>
                                <div>{selectedFeedback.user?.name || 'Unknown User'} ({selectedFeedback.role})</div>
                            </div>
                            <div>
                                <div className="form-label" style={{ marginBottom: 4 }}>Status & Priority</div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <StatusBadge status={selectedFeedback.status} />
                                    <span style={{ color: getPriorityColor(selectedFeedback.priority), fontSize: 13, fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-active)' }}>
                                        {selectedFeedback.priority}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="form-label" style={{ marginBottom: 4 }}>Description</div>
                            <div style={{ 
                                padding: 16, 
                                background: 'var(--bg-input)', 
                                borderRadius: 'var(--radius-md)',
                                fontSize: 14,
                                lineHeight: 1.5,
                                border: '1px solid var(--border-default)'
                            }}>
                                {selectedFeedback.description}
                            </div>
                        </div>

                        {selectedFeedback.adminResponse && (
                            <div>
                                <div className="form-label" style={{ marginBottom: 4 }}>Your Response</div>
                                <div style={{ 
                                    padding: 16, 
                                    background: 'var(--brand-primary-subtle)', 
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 14,
                                    lineHeight: 1.5,
                                    border: '1px solid var(--brand-primary-border)'
                                }}>
                                    {selectedFeedback.adminResponse}
                                </div>
                            </div>
                        )}

                        {selectedFeedback.status !== 'CLOSED' && selectedFeedback.status !== 'RESOLVED' && (
                            <div>
                                <div className="form-label" style={{ marginBottom: 8 }}>Reply / Resolution Note</div>
                                <textarea 
                                    className="form-textarea" 
                                    style={{ height: 100, resize: 'vertical' }}
                                    placeholder="Add a response or resolution note..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                ></textarea>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
