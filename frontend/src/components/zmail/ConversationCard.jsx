import React from 'react';
import { Paperclip, ShieldAlert } from 'lucide-react';

function formatTime(d) {
    if (!d) return '';
    return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ConversationCard({ entry, isSelected, onClick }) {
    const isSupport = entry.senderAddress === 'support@zeroleak.com' || entry.subject?.includes('ZSUP');
    const sender = entry.isDraft ? `To: ${entry.to?.[0]?.name || 'Unknown'}` : (entry.senderName || entry.senderAddress);

    return (
        <div className={`zm-conv-card ${!entry.isRead ? 'unread' : ''} ${isSelected ? 'selected' : ''}`} onClick={onClick}>
            <div className="zm-card-header">
                <div className="zm-card-sender">
                    {!entry.isRead && <span className="zm-unread-dot" />}
                    {isSupport && <ShieldAlert size={12} color="var(--zm-support-accent)" />}
                    {sender}
                </div>
                <div className="zm-card-time">{formatTime(entry.sentAt)}</div>
            </div>
            <div className="zm-card-subject">{entry.subject || '(no subject)'}</div>
            <div className="zm-card-preview">{entry.snippet || '...'}</div>
            
            {(entry.hasAttachment || entry.isDraft) && (
                <div className="zm-card-meta">
                    {entry.hasAttachment && <><Paperclip size={12} /> Attachments</>}
                    {entry.isDraft && <span className="zm-tag">Draft</span>}
                </div>
            )}
        </div>
    );
}
