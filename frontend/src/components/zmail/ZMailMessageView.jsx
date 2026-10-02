/**
 * ZMailMessageView — Full single-message viewer with reply/forward
 */
import React, { useState } from 'react';
import {
    Reply, CornerUpRight, Forward, Star, AlertCircle, Archive,
    Trash2, RotateCcw, Paperclip, Download, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { ZMailCompose } from './ZMailCompose.jsx';
import {
    patchMessage, patchMessageWithBody,
} from '../../hooks/useZMail.jsx';
import { useToast } from '../Toast.jsx';

function getAuthHeader() {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('profToken') ||
        localStorage.getItem('studentToken') || localStorage.getItem('auditorToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

export function ZMailMessageView({ message, onBack, onRefresh, onUpdate }) {
    const [replyOpen, setReplyOpen] = useState(false);
    const [forwardOpen, setForwardOpen] = useState(false);
    const [replyAll, setReplyAll] = useState(false);
    const toast = useToast();

    if (!message) return null;

    const { entry = {}, attachments = [], to = [], cc = [], senderAddress, senderName, subject, body, sentAt } = message;

    const handleStar = async (e) => {
        if (e) e.preventDefault();
        try {
            await patchMessageWithBody(message._id, 'star', { starred: !entry.isStarred });
            if (onUpdate) onUpdate({ isStarred: !entry.isStarred });
            else if (onRefresh) onRefresh();
        } catch { toast.error('Failed to star message'); }
    };

    const handleImportant = async (e) => {
        if (e) e.preventDefault();
        try {
            await patchMessageWithBody(message._id, 'important', { important: !entry.isImportant });
            if (onUpdate) onUpdate({ isImportant: !entry.isImportant });
            else if (onRefresh) onRefresh();
        } catch { toast.error('Failed to mark important'); }
    };

    const handleArchive = async () => {
        try {
            await patchMessage(message._id, 'archive');
            toast.success('Message archived');
            onRefresh && onRefresh();
            onBack && onBack();
        } catch { toast.error('Failed to archive message'); }
    };

    const handleTrash = async () => {
        try {
            await patchMessage(message._id, 'trash');
            toast.success('Moved to trash');
            onRefresh && onRefresh();
            onBack && onBack();
        } catch { toast.error('Failed to trash message'); }
    };

    const handleRestore = async () => {
        try {
            await patchMessage(message._id, 'restore');
            toast.success('Restored from trash');
            onRefresh && onRefresh();
        } catch { toast.error('Failed to restore message'); }
    };

    const handleDownload = (att) => {
        const token = getAuthHeader().Authorization?.split(' ')[1];
        const url = `/api/zmail/messages/${message._id}/attachments/${att._id}?token=${encodeURIComponent(token || '')}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = att.originalName;
        a.click();
    };

    const recipientList = [
        ...to.map(r => r.address || r),
        ...cc.map(r => r.address || r),
    ].join(', ');

    return (
        <div className="zmail-message-view">
            {/* Message Header */}
            <div className="zmail-message-header">
                <div className="zmail-message-subject-row">
                    <button type="button" className="zmail-back-btn" onClick={onBack} aria-label="Back to list">
                        ← Back
                    </button>
                    <h2 className="zmail-message-subject">{subject || '(no subject)'}</h2>
                    <div className="zmail-message-actions">
                        <button
                            type="button"
                            className={`topbar-btn ${entry.isStarred ? 'zmail-starred' : ''}`}
                            onClick={handleStar}
                            aria-label={entry.isStarred ? 'Unstar' : 'Star'}
                            title={entry.isStarred ? 'Unstar' : 'Star'}
                        >
                            <Star size={18} fill={entry.isStarred ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            type="button"
                            className={`topbar-btn ${entry.isImportant ? 'zmail-important' : ''}`}
                            onClick={handleImportant}
                            aria-label={entry.isImportant ? 'Mark not important' : 'Mark important'}
                            title="Important"
                        >
                            <AlertCircle size={18} />
                        </button>
                        {entry.isTrashed ? (
                            <button type="button" className="topbar-btn" onClick={handleRestore} aria-label="Restore from trash" title="Restore">
                                <RotateCcw size={18} />
                            </button>
                        ) : (
                            <>
                                <button type="button" className="topbar-btn" onClick={handleArchive} aria-label="Archive" title="Archive">
                                    <Archive size={18} />
                                </button>
                                <button type="button" className="topbar-btn" onClick={handleTrash} aria-label="Move to trash" title="Trash">
                                    <Trash2 size={18} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="zmail-message-meta">
                    <div className="zmail-sender-block">
                        <span className="zmail-avatar-sm">{(senderName || 'U').slice(0, 1).toUpperCase()}</span>
                        <div>
                            <div className="zmail-meta-sender">
                                <strong>{senderName}</strong>
                                <span className="zmail-meta-address"> &lt;{senderAddress}&gt;</span>
                            </div>
                            <div className="zmail-meta-recipients">
                                To: {recipientList || '(undisclosed)'}
                            </div>
                        </div>
                    </div>
                    <div className="zmail-meta-date">{formatDate(sentAt)}</div>
                </div>
            </div>

            {/* Message Body */}
            <div className="zmail-message-body">
                <pre className="zmail-body-text">{body}</pre>
            </div>

            {/* Attachments */}
            {attachments.length > 0 && (
                <div className="zmail-attachments-section">
                    <div className="zmail-attachments-label">
                        <Paperclip size={14} /> Attachments ({attachments.length})
                    </div>
                    <div className="zmail-attachments-grid">
                        {attachments.map(att => (
                            <div key={att._id} className="zmail-attachment-card">
                                <Paperclip size={16} className="zmail-att-icon" />
                                <div className="zmail-att-info">
                                    <span className="zmail-att-name">{att.originalName}</span>
                                    <span className="zmail-att-size">{(att.sizeBytes / 1024).toFixed(1)} KB</span>
                                </div>
                                <button
                                    className="topbar-btn"
                                    onClick={() => handleDownload(att)}
                                    aria-label={`Download ${att.originalName}`}
                                    title="Download"
                                >
                                    <Download size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reply / Forward actions */}
            {!entry.isTrashed && (
                <div className="zmail-reply-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => { setReplyAll(false); setReplyOpen(true); setForwardOpen(false); }}
                        aria-label="Reply"
                        id="zmail-reply-btn"
                    >
                        <Reply size={16} /> Reply
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => { setReplyAll(true); setReplyOpen(true); setForwardOpen(false); }}
                        aria-label="Reply All"
                        id="zmail-reply-all-btn"
                    >
                        <CornerUpRight size={16} /> Reply All
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => { setForwardOpen(true); setReplyOpen(false); }}
                        aria-label="Forward"
                        id="zmail-forward-btn"
                    >
                        <Forward size={16} /> Forward
                    </button>
                </div>
            )}

            {/* Inline reply compose */}
            {replyOpen && (
                <div className="zmail-inline-compose">
                    <ZMailCompose
                        initialTo={replyAll
                            ? [senderAddress, ...to.map(r => r.address || r).filter(a => a !== message.senderAddress)]
                            : [senderAddress]}
                        initialSubject={subject?.startsWith('Re: ') ? subject : `Re: ${subject}`}
                        initialBody={`\n\n--- Original message from ${senderName} (${formatDate(sentAt)}) ---\n${body}`}
                        replyToMessageId={message._id}
                        minimizable={false}
                        onClose={() => setReplyOpen(false)}
                        onSent={() => { setReplyOpen(false); onRefresh && onRefresh(); }}
                    />
                </div>
            )}

            {/* Inline forward compose */}
            {forwardOpen && (
                <div className="zmail-inline-compose">
                    <ZMailCompose
                        initialSubject={subject?.startsWith('Fwd: ') ? subject : `Fwd: ${subject}`}
                        initialBody={`\n\n---------- Forwarded message ----------\nFrom: ${senderName} <${senderAddress}>\nDate: ${formatDate(sentAt)}\nSubject: ${subject}\n\n${body}`}
                        minimizable={false}
                        onClose={() => setForwardOpen(false)}
                        onSent={() => { setForwardOpen(false); onRefresh && onRefresh(); }}
                    />
                </div>
            )}
        </div>
    );
}
