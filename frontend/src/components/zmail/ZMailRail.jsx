import React from 'react';
import { Inbox, Send, File, Star, Archive, Trash2, Edit3, Shield } from 'lucide-react';
import { useZMail } from '../../hooks/useZMail.jsx';

export function ZMailRail({ folder, setFolder, onCompose }) {
    const { unreadCount, account } = useZMail();
    const isSupport = account?.userType === 'Support' || account?.isSupportMailbox;

    const navs = [
        { id: 'inbox', label: 'Inbox', icon: Inbox, count: unreadCount },
        { id: 'sent', label: 'Messages', icon: Send },
        { id: 'starred', label: 'Starred', icon: Star },
        { id: 'drafts', label: 'Drafts', icon: File },
        { id: 'archive', label: 'Archive', icon: Archive },
        { id: 'trash', label: 'Trash', icon: Trash2 },
    ];

    return (
        <div className="zm-rail">
            <div className="zm-rail-header">
                <div className="zm-rail-brand">
                    <div className="icon">Z</div>
                    <div className="text">ZMAIL</div>
                </div>
            </div>

            <button className="zm-compose-btn" onClick={onCompose}>
                <Edit3 size={16} /> New
            </button>

            <div className="zm-nav-list">
                {navs.map(n => (
                    <div 
                        key={n.id} 
                        className={`zm-nav-item ${folder === n.id ? 'active' : ''}`}
                        onClick={() => setFolder(n.id)}
                    >
                        <div className="nav-left">
                            <n.icon size={16} /> {n.label}
                        </div>
                        {n.count > 0 && <span className="zm-nav-badge">{n.count}</span>}
                    </div>
                ))}
                
                {isSupport && (
                    <div className="zm-nav-item" style={{ marginTop: 24 }}>
                        <div className="nav-left"><Shield size={16} color="var(--zm-support-accent)" /> Support</div>
                    </div>
                )}
            </div>
        </div>
    );
}
