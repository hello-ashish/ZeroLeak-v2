import React, { useState } from 'react';
import { useRealBlockchain } from '../../hooks/useRealBlockchain';
import PrivateLedgerVisualizer from './PrivateLedgerVisualizer';
import PublicAnchorPanel from './PublicAnchorPanel';

export default function RealBlockchainDashboard() {
    const { ledger, status, anchor, loading, error, refresh, verifyLedger } = useRealBlockchain();
    const [verifying, setVerifying] = useState(false);
    const [verifyResult, setVerifyResult] = useState(null);

    const handleVerify = async () => {
        setVerifying(true);
        const result = await verifyLedger();
        setVerifyResult(result);
        setVerifying(false);
    };

    if (loading) return <div>Loading real blockchain data...</div>;
    if (error) return <div style={{ color: '#ef4444' }}>Error: {error}</div>;

    return (
        <div className="dashboard-container">
            <div className="main-panel">
                <div className="card">
                    <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>LIVE / REAL BLOCKCHAIN</h2>
                            <span style={{ color: 'var(--text-secondary)' }}>Network: {status?.network || 'ZEROLEAK-PERMISSIONED-FABRIC'}</span>
                        </div>
                        <div className="controls-group">
                            <button className="btn btn-primary" onClick={refresh}>Refresh Data</button>
                            <button className="btn btn-primary" onClick={handleVerify} disabled={verifying}>
                                {verifying ? 'Verifying...' : 'Verify Ledger'}
                            </button>
                        </div>
                    </div>
                </div>

                {verifyResult && (
                    <div className="card" style={{ background: verifyResult.valid ? 'var(--success-subtle)' : 'var(--danger-subtle)', borderColor: verifyResult.valid ? 'var(--success)' : 'var(--danger)' }}>
                        <div className="card-body">
                            <h3 style={{ margin: 0, color: verifyResult.valid ? 'var(--success)' : 'var(--danger)' }}>
                                {verifyResult.valid ? '✓ Verified' : '✗ Integrity Failure'}
                            </h3>
                            {verifyResult.reason && <p style={{ marginTop: '8px', color: 'var(--text-primary)' }}>{verifyResult.reason}</p>}
                        </div>
                    </div>
                )}

                <PrivateLedgerVisualizer ledger={ledger} isMock={false} />
            </div>
            
            <div className="side-panel">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Private Ledger Status</h3>
                    </div>
                    <div className="card-body" style={{ paddingTop: 0 }}>
                        <div className="data-row">
                            <span>Status</span>
                            <span className={status?.connected ? 'badge badge-success' : 'badge badge-danger'}>
                                {status?.connected ? 'Connected' : 'Unavailable'}
                            </span>
                        </div>
                        <div className="data-row">
                            <span>Ledger Height</span>
                            <span>{status?.blockCount || 0}</span>
                        </div>
                    </div>
                </div>

                <PublicAnchorPanel anchor={anchor} isMock={false} />
            </div>
        </div>
    );
}
