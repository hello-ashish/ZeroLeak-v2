import React from 'react';
import { Inbox, Send, File, Star, Archive, Trash2, Edit3, Shield } from 'lucide-react';
import { useZMail } from '../../hooks/useZMail.jsx';

export function ZMailRail({ folder, setFolder, onCompose }) {
    const { unreadCount, account } = useZMail();
    const isSupport = account?.userType === 'Support' || account?.isSupportMailbox;

    const handleSidebarDrag = (e) => {
        e.preventDefault();
        const startX = e.pageX;
        const currentWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--zmail-sidebar-width')) || 240;

        const onMouseMove = (moveEvent) => {
            const newWidth = currentWidth + (moveEvent.pageX - startX);
            const clamped = Math.min(Math.max(newWidth, 200), 500); // min 200px, max 500px
            document.documentElement.style.setProperty('--zmail-sidebar-width', `${clamped}px`);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.documentElement.classList.remove('zmail-sidebar-is-dragging');
        };

        document.body.style.cursor = 'col-resize';
        document.documentElement.classList.add('zmail-sidebar-is-dragging');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const navs = [
        { id: 'inbox', label: 'Inbox', icon: Inbox, count: unreadCount },
        { id: 'sent', label: 'Sent', icon: Send },
        { id: 'starred', label: 'Starred', icon: Star },
        { id: 'drafts', label: 'Drafts', icon: File },
        { id: 'archive', label: 'Archive', icon: Archive },
        { id: 'trash', label: 'Trash', icon: Trash2 },
    ];

    return (
        <div className="zm-rail">
            <div className="zm-rail-resizer" onMouseDown={handleSidebarDrag} />
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
