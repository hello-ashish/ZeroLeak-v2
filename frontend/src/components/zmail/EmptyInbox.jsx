import React from 'react';

export function EmptyInbox({ folder }) {
    return (
        <div className="zm-empty-state">
            <div className="zm-empty-circle">
                ◌
            </div>
            <div className="zm-empty-title">Your {folder} is clear</div>
            <div className="zm-empty-desc">No conversations need your attention right now.</div>
        </div>
    );
}
