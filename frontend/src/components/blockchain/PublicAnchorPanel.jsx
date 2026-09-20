import React, { useState } from 'react';

export default function PublicAnchorPanel({ anchor, isMock }) {
    if (!anchor && !isMock) {
        return <div className="card" style={{ marginTop: '24px' }}>
            <div className="card-header">
                <h3 className="card-title">Public Anchor <span className="badge badge-danger" style={{ marginLeft: '8px' }}>Unavailable</span></h3>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
                <p style={{ color: 'var(--text-secondary)' }}>No public anchor checkpoints found.</p>
            </div>
        </div>;
    }

    if (isMock) {
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

    return (
        <div className="card" style={{ marginTop: '24px' }}>
            <div className="card-header">
                <h3 className="card-title">Public Anchor <span className="badge badge-success" style={{ marginLeft: '8px' }}>Connected</span></h3>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
                <div className="data-row">
                    <span>Network</span>
                    <span>Polygon Amoy</span>
                </div>
                <div className="data-row">
                    <span>Checkpoint Sequence</span>
                    <span>{anchor.sequence}</span>
                </div>
                <div className="data-row">
                    <span>Ledger Height</span>
                    <span>{anchor.height}</span>
                </div>
                <div className="data-row">
                    <span>Ledger Hash</span>
                    <span className="block-hash">{anchor.ledgerHash ? anchor.ledgerHash.substring(0, 16) + '...' : 'N/A'}</span>
                </div>
                <div className="data-row">
                    <span>Transaction</span>
                    <span className="block-hash">{anchor.txHash || 'N/A'}</span>
                </div>
                <div style={{ marginTop: '16px' }}>
                    {anchor.txHash ? (
                        <a href={`https://amoy.polygonscan.com/tx/${anchor.txHash}`} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none' }}>
                            View on Explorer ↗
                        </a>
                    ) : (
                        <span style={{ color: 'var(--text-disabled)' }}>Explorer Link Unavailable</span>
                    )}
                </div>
            </div>
        </div>
    );
}
