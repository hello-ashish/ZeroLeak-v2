import React from 'react';
import { ConversationCard } from './ConversationCard.jsx';
import { EmptyInbox } from './EmptyInbox.jsx';

export function ConversationList({ entries, loading, selectedEntry, onSelect, folder }) {
    if (loading) return <div className="zm-conv-list"><div style={{padding: 24, color: 'var(--zm-text-muted)'}}>Loading...</div></div>;
    
    if (!entries || entries.length === 0) {
        return <div className="zm-conv-list"><EmptyInbox folder={folder} /></div>;
    }

    // Grouping logic (simplified)
    const today = [];
    const older = [];
    const now = new Date();
    
    entries.forEach(e => {
        const d = new Date(e.sentAt);
        if (d.toDateString() === now.toDateString()) today.push(e);
        else older.push(e);
    });

    return (
        <div className="zm-conv-list">
            <div className="zm-list-scroll">
                {today.length > 0 && (
                    <div className="zm-list-group">
                        <div className="zm-list-group-title">Today</div>
                        {today.map(e => (
                            <ConversationCard 
                                key={e.messageId} 
                                entry={e} 
                                isSelected={selectedEntry?.messageId === e.messageId}
                                onClick={() => onSelect(e)}
                            />
                        ))}
                    </div>
                )}
                {older.length > 0 && (
                    <div className="zm-list-group">
                        <div className="zm-list-group-title">Older</div>
                        {older.map(e => (
                            <ConversationCard 
                                key={e.messageId} 
                                entry={e} 
                                isSelected={selectedEntry?.messageId === e.messageId}
                                onClick={() => onSelect(e)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
