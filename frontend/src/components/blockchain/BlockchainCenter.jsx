import React, { useState } from 'react';
import './BlockchainCenter.css';
import RealBlockchainDashboard from './RealBlockchainDashboard';
import MockBlockchainDashboard from './MockBlockchainDashboard';

export default function BlockchainCenter() {
    const [mode, setMode] = useState('REAL'); // 'REAL' or 'MOCK'

    return (
        <div className="blockchain-center">
            <div className="page-header">
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Blockchain Center</h1>
                        <div className="page-subtitle">Explore, verify, and manage ZeroLeak's blockchain integrity layers.</div>
                    </div>
                    <div className="mode-switch">
                        <button 
                            className={`mode-btn ${mode === 'REAL' ? 'active real' : ''}`}
                            onClick={() => setMode('REAL')}
                        >
                            REAL BLOCKCHAIN
                        </button>
                        <button 
                            className={`mode-btn ${mode === 'MOCK' ? 'active mock' : ''}`}
                            onClick={() => setMode('MOCK')}
                        >
                            MOCK BLOCKCHAIN
                        </button>
                    </div>
                </div>
            </div>

            {mode === 'REAL' ? <RealBlockchainDashboard /> : <MockBlockchainDashboard />}
        </div>
    );
}
