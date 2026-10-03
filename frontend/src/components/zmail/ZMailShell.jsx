import React, { useState, useEffect, useRef } from 'react';
import { ZMailRail } from './ZMailRail.jsx';
import { ZMailHeader } from './ZMailHeader.jsx';
import { ConversationList } from './ConversationList.jsx';
import { ConversationView } from './ConversationView.jsx';
import { ComposeWorkspace } from './ComposeWorkspace.jsx';
import { ZMailOverview } from './ZMailOverview.jsx';
import { fetchFolder, searchMail, emptyTrash } from '../../hooks/useZMail.jsx';
import { useZMail } from '../../hooks/useZMail.jsx';
import { useToast } from '../Toast.jsx';

export function ZMailShell({ isFullScreen }) {
    const [folder, setFolder] = useState('inbox');
    const [entries, setEntries] = useState([]);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [showCompose, setShowCompose] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchMode, setSearchMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const searchTimeout = useRef(null);
    
    const { unreadCount, connected, account, refreshCounts } = useZMail();
    const toast = useToast();

    useEffect(() => {
        setSearchMode(false);
        setSearchQuery('');
        loadFolder(folder);
        setSelectedEntry(null);
    }, [folder]);

    useEffect(() => {
        if (folder === 'inbox') loadFolder('inbox', true);
    }, [unreadCount]);

    const loadFolder = async (f, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await fetchFolder(f, 1);
            setEntries(data.entries || []);
        } catch {
            toast.error('Failed to load messages.');
        }
        if (!silent) setLoading(false);
    };

    const handleSearch = (q) => {
        setSearchQuery(q);
        if (!q.trim()) { 
            setSearchMode(false); 
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
            loadFolder(folder, true);
            return; 
        }
        setSearchMode(true);
        
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(async () => {
            try {
                const data = await searchMail(q);
                setEntries(data.results || []);
            } catch (err) { 
                console.error("Search error:", err);
                toast.error('Search failed'); 
            }
        }, 400);
    };

    return (
        <div className={`zmail-shell ${isFullScreen ? 'full-screen' : ''}`}>
            <ZMailRail folder={folder} setFolder={setFolder} onCompose={() => setShowCompose(true)} />
            
            <div className="zm-main">
                <ZMailHeader searchQuery={searchQuery} onSearch={handleSearch} connected={connected} />
                
                <div className="zm-workspace">
                    <ConversationList 
                        entries={entries} 
                        loading={loading}
                        selectedEntry={selectedEntry} 
                        onSelect={setSelectedEntry} 
                        folder={folder}
                    />
                    
                    {selectedEntry ? (
                        <ConversationView 
                            entry={selectedEntry} 
                            onBack={() => setSelectedEntry(null)} 
                            onRefresh={() => {
                                loadFolder(folder, true);
                                refreshCounts();
                            }}
                        />
                    ) : (
                        <ZMailOverview account={account} unreadCount={unreadCount} entries={entries} onCompose={() => setShowCompose(true)} />
                    )}
                </div>
            </div>

            {showCompose && <ComposeWorkspace onClose={() => setShowCompose(false)} />}
        </div>
    );
}
