import React from 'react';
import { Search, Wifi, WifiOff } from 'lucide-react';

export function ZMailHeader({ searchQuery, onSearch, connected }) {
    return (
        <div className="zm-header">
            <div className="zm-search-capsule">
                <Search size={16} color="var(--zm-text-muted)" />
                <input 
                    type="text" 
                    placeholder="Search ZMail" 
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                />
                <span className="shortcut">⌘ K</span>
            </div>
            
            <div className="zm-header-actions">
                {connected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <Wifi size={14} color="var(--zm-brand-blue)" /> Connected
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <WifiOff size={14} color="var(--zm-text-muted)" /> Offline
                    </div>
                )}
            </div>
        </div>
    );
}
