import React, { useState } from 'react';

export default function PrivateLedgerVisualizer({ ledger, isMock }) {
    const [selectedBlock, setSelectedBlock] = useState(null);

    if (!ledger || ledger.length === 0) {
        return <div style={{ color: '#94a3b8' }}>{isMock ? "No simulation blocks yet." : "No private blockchain transactions are available."}</div>;
    }

    return (
        <div style={{ display: 'flex', gap: '20px' }}>
            <div className="ledger-visualizer" style={{ flex: 1 }}>
                {ledger.map((block, index) => (
                    <React.Fragment key={block.eventId || index}>
                        <div 
                            className={`blockchain-block ${isMock ? 'mock' : ''} ${block.canonicalHash.includes('tampered') ? 'tampered' : ''}`}
                            onClick={() => setSelectedBlock(block)}
                        >
                            <div className="block-header">
                                <span>{block.commitmentType}</span>
                                <span>Height: {block.height}</span>
                            </div>
                            <div className="block-hash">
                                Tx: {block.txId}
                            </div>
                            <div className="block-hash" style={{ marginTop: '4px' }}>
                                Hash: {block.canonicalHash.substring(0, 32)}...
                            </div>
                        </div>
                        {index < ledger.length - 1 && (
                            <div className="arrow-down">↓</div>
                        )}
                    </React.Fragment>
                ))}
            </div>
            
            {/* Blockchain Inspector Side Panel */}
            <div style={{ flex: 1 }}>
                {selectedBlock ? (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Blockchain Inspector</h3>
                        </div>
                        <div className="card-body" style={{ paddingTop: 0 }}>
                            <div className="data-row">
                                <span>Event ID</span>
                                <span>{selectedBlock.eventId}</span>
                            </div>
                            <div className="data-row">
                                <span>Type</span>
                                <span>{selectedBlock.commitmentType}</span>
                            </div>
                            <div className="data-row">
                                <span>Tx ID</span>
                                <span>{selectedBlock.txId}</span>
                            </div>
                            <div className="data-row">
                                <span>Height</span>
                                <span>{selectedBlock.height}</span>
                            </div>
                            <div className="data-row">
                                <span>Timestamp</span>
                                <span>{new Date(selectedBlock.timestamp).toLocaleString()}</span>
                            </div>
                            <div className="data-row" style={{ flexDirection: 'column', gap: '4px', borderBottom: 'none' }}>
                                <span>Canonical Hash</span>
                                <span className="block-hash">{selectedBlock.canonicalHash}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ color: '#64748b', textAlign: 'center', marginTop: '40px' }}>
                        Select a block to inspect details
                    </div>
                )}
            </div>
        </div>
    );
}
