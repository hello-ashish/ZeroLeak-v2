import React, { useState } from 'react';
import { X, Send, Paperclip } from 'lucide-react';
import { sendMessage } from '../../hooks/useZMail.jsx';
import { useToast } from '../Toast.jsx';

export function ComposeWorkspace({ onClose }) {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [minimized, setMinimized] = useState(false);
    const toast = useToast();

    const handleSend = async () => {
        try {
            await sendMessage({
                to: to ? [to.trim()] : [],
                subject,
                body,
                attachments: []
            });
            toast.success('Sent successfully');
            onClose();
        } catch { toast.error('Failed to send'); }
    };

    if (minimized) {
        return (
            <div className="zm-compose-workspace minimized" onClick={() => setMinimized(false)}>
                <div className="zm-compose-header">
                    <div className="zm-compose-title">Draft: {subject || 'New Message'}</div>
                    <X size={16} onClick={(e) => { e.stopPropagation(); onClose(); }} />
                </div>
            </div>
        );
    }

    return (
        <div className="zm-compose-workspace">
            <div className="zm-compose-header" onClick={() => setMinimized(true)}>
                <div className="zm-compose-title">New message</div>
                <X size={16} style={{cursor:'pointer'}} onClick={(e) => { e.stopPropagation(); onClose(); }} />
            </div>
            
            <div className="zm-compose-body">
                <div className="zm-compose-field">
                    <div className="zm-compose-label">To</div>
                    <input className="zm-compose-input" value={to} onChange={e => setTo(e.target.value)} placeholder="email@zeroleak.com" />
                </div>
                <div className="zm-compose-field">
                    <div className="zm-compose-label">Subject</div>
                    <input className="zm-compose-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="What's this about?" />
                </div>
                <textarea className="zm-compose-textarea" value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." />
            </div>
            
            <div className="zm-compose-footer">
                <button className="zm-action-btn"><Paperclip size={16} /></button>
                <button className="zm-send-btn" onClick={handleSend}>Send <Send size={14} style={{marginLeft: 8}} /></button>
            </div>
        </div>
    );
}
