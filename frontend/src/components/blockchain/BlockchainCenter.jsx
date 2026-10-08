import React from 'react';
import './BlockchainCenter.css';
import MockBlockchainDashboard from './MockBlockchainDashboard';

export default function BlockchainCenter() {
    return (
        <div className="blockchain-center">
            <div className="page-header">
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Blockchain Center</h1>
                        <div className="page-subtitle">Explore, verify, and manage ZeroLeak's blockchain integrity layers.</div>
                    </div>
                </div>
            </div>

            <MockBlockchainDashboard />
        </div>
    );
}
