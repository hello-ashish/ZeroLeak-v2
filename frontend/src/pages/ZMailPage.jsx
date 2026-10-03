/**
 * ZMailPage — Main ZMail application page
 * Route: /zmail (shared, role-agnostic)
 *
 * Layout:
 *  [Sidebar] | [Message List] | [Message View (optional)]
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, RefreshCw, Trash2, ChevronLeft, ChevronRight, Loader2, Wifi, WifiOff, Mailbox, Maximize, Minimize } from 'lucide-react';
import { AdminLayout } from './admin/AdminLayout.jsx';
import { StudentLayout } from './student/StudentLayout.jsx';
import { ProfessorLayout } from './professor/ProfessorLayout.jsx';
import { AuditorLayout } from './auditor/AuditorLayout.jsx';
import { ZMailSidebar } from '../components/zmail/ZMailSidebar.jsx';
import { ZMailListItem } from '../components/zmail/ZMailListItem.jsx';
import { ZMailMessageView } from '../components/zmail/ZMailMessageView.jsx';
import { ZMailCompose } from '../components/zmail/ZMailCompose.jsx';
import {
    fetchFolder, fetchMessage, searchMail, patchMessage,
    patchMessageWithBody, emptyTrash,
} from '../hooks/useZMail.jsx';
import { useZMail } from '../hooks/useZMail.jsx';
import { useToast } from '../components/Toast.jsx';
import './zmail.css';

const FOLDER_LABELS = {
    inbox: 'Inbox', sent: 'Sent', drafts: 'Drafts',
    starred: 'Starred', important: 'Important',
    archive: 'Archive', trash: 'Trash', all: 'All Mail',
};

function ZMailContent({ isFullScreen, toggleFullScreen }) {
    const [folder, setFolder] = useState('inbox');
    const [entries, setEntries] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [messageLoading, setMessageLoading] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMode, setSearchMode] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const searchDebounce = useRef(null);
    const listPanelRef = useRef(null);

    const handleListResize = (e) => {
        e.preventDefault();
        const startX = e.pageX;
        const startWidth = listPanelRef.current.offsetWidth;

        const onMouseMove = (moveEvent) => {
            const newWidth = startWidth + (moveEvent.pageX - startX);
            const clamped = Math.min(Math.max(newWidth, 280), 600);
            listPanelRef.current.style.width = `${clamped}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
        };

        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    const { unreadCount, refreshCounts, connected, account } = useZMail();
    const toast = useToast();

    const loadFolder = useCallback(async (f = folder, page = 1) => {
        setLoading(true);
        setSelectedEntry(null);
        setSelectedMessage(null);
        try {
            const data = await fetchFolder(f, page);
            setEntries(data.entries || []);
            setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
        } catch (e) {
            toast.error('Failed to load messages.');
        }
        setLoading(false);
    }, [folder]);

    useEffect(() => {
        setSearchMode(false);
        setSearchQuery('');
        loadFolder(folder, 1);
    }, [folder]);

    // Real-time: refresh inbox when new mail arrives
    useEffect(() => {
        if (folder === 'inbox') loadFolder('inbox', 1);
    }, [unreadCount]);

    const handleSelectEntry = useCallback(async (entry) => {
        setSelectedEntry(entry);
        setMessageLoading(true);
        try {
            const data = await fetchMessage(entry.messageId);
            setSelectedMessage(data.message);
            // Mark as read
            if (!entry.isRead) {
                await patchMessage(entry.messageId, 'read');
                setEntries(prev => prev.map(e =>
                    e.messageId === entry.messageId ? { ...e, isRead: true } : e
                ));
                refreshCounts();
            }
        } catch {
            toast.error('Failed to load message.');
        }
        setMessageLoading(false);
    }, [refreshCounts]);

    const handleStar = useCallback(async (entry) => {
        const newVal = !entry.isStarred;
        setEntries(prev => prev.map(e =>
            e.messageId === entry.messageId ? { ...e, isStarred: newVal } : e
        ));
        try {
            await patchMessageWithBody(entry.messageId, 'star', { starred: newVal });
        } catch { toast.error('Failed to star message'); }
    }, []);

    const handleSearch = useCallback(async (q) => {
        if (!q.trim()) { setSearchMode(false); return; }
        setSearchMode(true);
        setSearchLoading(true);
        try {
            const data = await searchMail(q);
            setSearchResults(data.results || []);
        } catch { toast.error('Search failed'); }
        setSearchLoading(false);
    }, []);

    const onSearchInput = (e) => {
        const q = e.target.value;
        setSearchQuery(q);
        clearTimeout(searchDebounce.current);
        if (!q.trim()) { setSearchMode(false); setSearchResults([]); return; }
        searchDebounce.current = setTimeout(() => handleSearch(q), 400);
    };

    const handleEmptyTrash = async () => {
        if (!window.confirm('Permanently delete all trashed messages? This cannot be undone.')) return;
        try {
            await emptyTrash();
            toast.success('Trash emptied');
            loadFolder('trash', 1);
        } catch { toast.error('Failed to empty trash'); }
    };

    const displayEntries = searchMode ? searchResults : entries;
    const isLoading = loading || searchLoading;

    return (
        <div className={`zmail-page ${!isFullScreen ? 'embedded' : ''}`}>
            {/* Sidebar */}
            <ZMailSidebar
                currentFolder={folder}
                onFolderChange={(f) => { setFolder(f); setSearchMode(false); setSearchQuery(''); }}
                onCompose={() => setShowCompose(true)}
                account={account}
            />

            {/* Main area */}
            <div className="zmail-main">
                {/* Header bar */}
                <div className="zmail-main-header">
                    <div className="zmail-search-bar">
                        <Search size={16} className="zmail-search-icon" />
                        <input
                            className="zmail-search-input"
                            type="search"
                            placeholder="Search mail... (from:, to:, subject:, is:unread)"
                            value={searchQuery}
                            onChange={onSearchInput}
                            aria-label="Search ZMail"
                            id="zmail-search-input"
                        />
                    </div>

                    <div className="zmail-main-header-actions">
                        <span className="zmail-connection-status" title={connected ? 'Connected' : 'Disconnected'}>
                            {connected ? <Wifi size={16} color="var(--success)" /> : <WifiOff size={16} color="var(--warning)" />}
                        </span>
                        <button
                            className="topbar-btn"
                            onClick={() => loadFolder(folder, 1)}
                            aria-label="Refresh"
                            title="Refresh"
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button
                            className="topbar-btn"
                            onClick={toggleFullScreen}
                            aria-label="Toggle Full Screen"
                            title="Toggle Full Screen"
                        >
                            {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                        {folder === 'trash' && entries.length > 0 && (
                            <button
                                className="btn btn-danger"
                                style={{ fontSize: 13, padding: '6px 12px' }}
                                onClick={handleEmptyTrash}
                                aria-label="Empty Trash"
                                id="zmail-empty-trash-btn"
                            >
                                <Trash2 size={14} /> Empty Trash
                            </button>
                        )}
                    </div>
                </div>

                {/* Two-column: list + message */}
                <div className="zmail-content-area">
                    {/* Message list */}
                    <div className={`zmail-list-panel ${selectedMessage ? 'has-message' : ''}`} ref={listPanelRef}>
                        <div className="zmail-resizer" onMouseDown={handleListResize} />
                        <div className="zmail-list-header">
                            <span className="zmail-list-title">
                                {searchMode ? `Search results` : FOLDER_LABELS[folder] || folder}
                                {!searchMode && pagination.total > 0 && (
                                    <span className="zmail-list-count"> ({pagination.total})</span>
                                )}
                                {searchMode && (
                                    <span className="zmail-list-count"> ({searchResults.length})</span>
                                )}
                            </span>
                            {/* Pagination */}
                            {!searchMode && pagination.pages > 1 && (
                                <div className="zmail-pagination">
                                    <button
                                        className="topbar-btn"
                                        disabled={pagination.page <= 1}
                                        onClick={() => loadFolder(folder, pagination.page - 1)}
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="zmail-page-info">
                                        {pagination.page} / {pagination.pages}
                                    </span>
                                    <button
                                        className="topbar-btn"
                                        disabled={pagination.page >= pagination.pages}
                                        onClick={() => loadFolder(folder, pagination.page + 1)}
                                        aria-label="Next page"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="zmail-loading">
                                <Loader2 size={28} className="spin" />
                                <span>Loading...</span>
                            </div>
                        ) : displayEntries.length === 0 ? (
                            <div className="zmail-empty-state">
                                <div className="zmail-empty-icon" style={{ color: 'var(--text-tertiary)' }}>
                                    <Mailbox size={48} strokeWidth={1.5} />
                                </div>
                                <div className="zmail-empty-title">
                                    {searchMode ? 'No search results' : `${FOLDER_LABELS[folder] || 'Folder'} is empty`}
                                </div>
                                <div className="zmail-empty-sub">
                                    {searchMode
                                        ? 'Try a different search query'
                                        : folder === 'inbox' ? 'Your inbox is empty — you\'re all caught up!' : ''}
                                </div>
                            </div>
                        ) : (
                            <div className="zmail-list" role="list">
                                {displayEntries.map((entry) => (
                                    <ZMailListItem
                                        key={entry.messageId}
                                        entry={entry}
                                        isSelected={selectedEntry?.messageId === entry.messageId}
                                        onClick={() => handleSelectEntry(entry)}
                                        onStar={() => handleStar(entry)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Message view panel */}
                    {selectedMessage && (
                        <div className="zmail-message-panel">
                            {messageLoading ? (
                                <div className="zmail-loading">
                                    <Loader2 size={28} className="spin" />
                                </div>
                            ) : (
                                <ZMailMessageView
                                    message={selectedMessage}
                                    onBack={() => { setSelectedMessage(null); setSelectedEntry(null); }}
                                    onRefresh={() => { loadFolder(folder, pagination.page); setSelectedMessage(null); }}
                                    onUpdate={(updates) => {
                                        setSelectedMessage(prev => ({
                                            ...prev,
                                            entry: { ...prev.entry, ...updates }
                                        }));
                                        setEntries(prev => prev.map(e =>
                                            e.messageId === selectedMessage.entry.messageId ? { ...e, ...updates } : e
                                        ));
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Compose window (floating) */}
            {showCompose && (
                <div className="zmail-compose-overlay">
                    <ZMailCompose
                        onClose={() => setShowCompose(false)}
                        onSent={() => { loadFolder(folder, 1); refreshCounts(); }}
                    />
                </div>
            )}
        </div>
    );
}

export default function ZMailPage() {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const toggleFullScreen = () => setIsFullScreen(v => !v);

    const content = <ZMailContent isFullScreen={isFullScreen} toggleFullScreen={toggleFullScreen} />;

    if (isFullScreen) {
        return content;
    }

    if (localStorage.getItem('adminToken')) return <AdminLayout noPadding={true}>{content}</AdminLayout>;
    if (localStorage.getItem('studentToken')) return <StudentLayout noPadding={true}>{content}</StudentLayout>;
    if (localStorage.getItem('profToken')) return <ProfessorLayout noPadding={true}>{content}</ProfessorLayout>;
    if (localStorage.getItem('auditorToken')) return <AuditorLayout noPadding={true}>{content}</AuditorLayout>;

    // Fallback if no token (shouldn't happen due to routing guards, but just in case)
    return content;
}
