import React, { useState } from 'react';

export default function PublicAnchorPanel() {
    return (
        <div className="card" style={{ marginTop: '24px', border: '1px solid var(--brand-accent)' }}>
            <div className="card-header">
                <h3 className="card-title">SIMULATED PUBLIC ANCHOR <span className="badge badge-brand" style={{ marginLeft: '8px' }}>DEMO</span></h3>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
                <div style={{ padding: '8px', background: 'var(--brand-accent)', color: 'white', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', borderRadius: '4px', marginBottom: '16px' }}>
                    NOT A REAL TRANSACTION
                </div>
                <div className="data-row">
                    <span>Network</span>
                    <span>Polygon Amoy (Mock)</span>
                </div>
                <div className="data-row">
                    <span>Latest Checkpoint</span>
                    <span>Height 42</span>
                </div>
                <div className="data-row">
                    <span>Transaction</span>
                    <span className="block-hash">0xmocktx...</span>
                </div>
                <div style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    This does not represent a real blockchain transaction. View on Explorer is disabled in Mock mode.
                </div>
            </div>
        </div>
    );
}
