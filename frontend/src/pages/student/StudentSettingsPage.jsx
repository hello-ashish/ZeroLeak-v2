import React from 'react';

const StudentSettingsPage = () => {
    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 48 }}>
            <div className="page-header" style={{ marginBottom: 32 }}>
                <h1 className="page-title" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>Settings</h1>
                <p className="page-subtitle" style={{ fontSize: 15 }}>Manage your app preferences.</p>
            </div>
            
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)' }}>Settings preferences will appear here in the future.</p>
            </div>
        </div>
    );
};

export default StudentSettingsPage;
