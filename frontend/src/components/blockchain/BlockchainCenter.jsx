// =============================================================================
// ZeroLeak — BlockchainCenter.jsx
// =============================================================================
// Two clearly separated sections:
//   1. Fabric Integrity Center — REAL production operational view
//      Shows actual Fabric network status, real ledger commitments,
//      and real integrity verification.
//   2. Mock Blockchain Lab — SIMULATION / EDUCATIONAL only
//      Clearly labelled. Never presented as real Fabric state.
// =============================================================================

import React, { useState } from 'react';
import './BlockchainCenter.css';
import FabricIntegrityCenter from './FabricIntegrityCenter';
import MockBlockchainDashboard from './MockBlockchainDashboard';

export default function BlockchainCenter({ token }) {
    const [activeSection, setActiveSection] = useState('fabric');

    return (
        <div className="blockchain-center">
            <div className="page-header">
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Integrity Center</h1>
                        <div className="page-subtitle">
                            Hyperledger Fabric integrity ledger · Verification · Commitment history
                        </div>
                    </div>

                    {/* Section switcher */}
                    <div className="bc-section-tabs" style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className={`btn ${activeSection === 'fabric' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveSection('fabric')}
                        >
                            Fabric Integrity Center
                        </button>
                        <button
                            className={`btn ${activeSection === 'mock' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setActiveSection('mock')}
                        >
                            Mock Lab
                            <span className="bc-sim-badge">SIMULATION</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Real Fabric Integrity Center ─────────────────────── */}
            {activeSection === 'fabric' && (
                <FabricIntegrityCenter token={token} />
            )}

            {/* ── Mock Lab (educational / demo only) ───────────────── */}
            {activeSection === 'mock' && (
                <div>
                    <div className="bc-mock-warning">
                        <span className="bc-mock-warning-icon">⚠</span>
                        <span>
                            <strong>SIMULATION MODE</strong> — The Mock Blockchain Lab below is a purely educational
                            demonstration. It does NOT represent real Fabric transactions, real commitments,
                            or real ZeroLeak data. Use the <strong>Fabric Integrity Center</strong> tab to
                            verify real integrity on the Hyperledger Fabric ledger.
                        </span>
                    </div>
                    <MockBlockchainDashboard />
                </div>
            )}
        </div>
    );
}
