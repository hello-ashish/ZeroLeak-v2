import React, { useEffect, useState } from 'react';
import { fetchMessage, patchMessageWithBody, patchMessage } from '../../hooks/useZMail.jsx';
import { MessageBubble } from './MessageBubble.jsx';
import { ContactContextPanel } from './ContactContextPanel.jsx';
import { ArrowLeft, Star, Archive, Trash2 } from 'lucide-react';
import { useToast } from '../Toast.jsx';

export function ConversationView({ entry, onBack, onRefresh }) {
    const [message, setMessage] = useState(null);
    const toast = useToast();

    useEffect(() => {
        loadMessage();
    }, [entry.messageId]);

    const loadMessage = async () => {
        try {
            const data = await fetchMessage(entry.messageId);
            setMessage(data.message);
            if (!entry.isRead) {
                await patchMessage(entry.messageId, 'read');
                onRefresh();
            }
        } catch { toast.error('Failed to load conversation'); }
    };

    const doAction = async (action, body) => {
        try {
            if (body) await patchMessageWithBody(entry.messageId, action, body);
            else await patchMessage(entry.messageId, action);
            onRefresh();
            if (['archive', 'trash'].includes(action)) onBack();
        } catch { toast.error('Action failed'); }
    };

    if (!message) return <div className="zm-conv-view"><div style={{padding: 48, textAlign: 'center'}}>Loading conversation...</div></div>;

    return (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div className="zm-conv-view">
                <div className="zm-view-header">
                    <div>
                        <div className="zm-view-subject">{message.subject || '(no subject)'}</div>
                        <div className="zm-view-tags">
                            <span className="zm-tag">Conversation</span>
                            {entry.isStarred && <span className="zm-tag" style={{color: '#eab308'}}>Starred</span>}
                        </div>
                    </div>
                    <div className="zm-view-actions">
                        <button className="zm-action-btn" onClick={() => doAction('star', { starred: !entry.isStarred })}><Star size={16} /></button>
                        <button className="zm-action-btn" onClick={() => doAction('archive')}><Archive size={16} /></button>
                        <button className="zm-action-btn" onClick={() => doAction('trash')}><Trash2 size={16} /></button>
                    </div>
                </div>
                
                <div className="zm-thread-scroll">
                    {/* Simplified thread rendering — in a real app this maps thread history */}
                    <MessageBubble msg={message} isSupport={message.senderAddress === 'support@zeroleak.com'} />
                </div>
            </div>
            
            <ContactContextPanel message={message} />
        </div>
    );
}
