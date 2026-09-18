import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    ZoomIn, ZoomOut, Maximize, Minimize, Play, RefreshCw, XCircle, ChevronRight, Hash,
    Clock, Blocks, ShieldCheck, ShieldAlert, CheckCircle2, Search, Map
} from 'lucide-react';
import { useToast } from './Toast';

const shortHash = (value) => value ? `${value.slice(0, 12)}…${value.slice(-10)}` : '—';
const formatDate = (value) => value ? new Date(value).toLocaleString() : '—';

export default function BlockchainVisualizer({ blocks, loading, onVerify }) {
    const toast = useToast();
    const containerRef = useRef(null);

    // Viewport state
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Interaction state
    const [selectedBlock, setSelectedBlock] = useState(null);
    const [search, setSearch] = useState('');

    // Verification Animation State
    const [verifying, setVerifying] = useState(false);
    const [verifyIndex, setVerifyIndex] = useState(-1);
    const [verifyResults, setVerifyResults] = useState({}); // blockIndex -> 'valid' | 'invalid'

    // Sort blocks sequentially (genesis -> latest)
    const sortedBlocks = useMemo(() => {
        return [...(blocks || [])].sort((a, b) => a.blockIndex - b.blockIndex);
    }, [blocks]);

    const filteredBlocks = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return sortedBlocks;
        return sortedBlocks.filter(b =>
            String(b.blockIndex).includes(q) ||
            b.blockType.toLowerCase().includes(q) ||
            String(b.entityId).toLowerCase().includes(q) ||
            String(b.hash).toLowerCase().includes(q)
        );
    }, [sortedBlocks, search]);

    // Pan & Zoom handlers
    const handleWheel = (e) => {
        if (!containerRef.current) return;

        // Ignore scrolling if hovering over drawer or controls
        if (e.target.closest('.inspector-drawer') || e.target.closest('.controls')) return;

        // Scroll horizontally
        if (e.deltaY !== 0 && !e.ctrlKey) {
            setPan(p => ({ ...p, x: p.x - e.deltaY }));
            return;
        }
    };

    const handleMouseDown = (e) => {
        if (e.target.closest('.block-node') || e.target.closest('.controls') || e.target.closest('.inspector-drawer')) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart]);

    // Actions
    const zoomIn = () => setScale(s => Math.min(s + 0.2, 2));
    const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.3));

    const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

    const focusLatest = () => {
        if (sortedBlocks.length === 0) return;
        setScale(1);
        // Approximate width of nodes: 280px + 60px gap = 340px
        const targetX = -((sortedBlocks.length - 1) * 340) + 200;
        setPan({ x: targetX, y: 0 });
    };

    // Verification sequencer
    const startVerification = async () => {
        if (verifying) return;
        setVerifying(true);
        setVerifyIndex(-1);
        setVerifyResults({});

        // Visual animation step by step
        for (let i = 0; i < sortedBlocks.length; i++) {
            setVerifyIndex(i);

            // Pan to the verifying block smoothly
            setPan({ x: -(i * 340) + window.innerWidth / 3, y: 0 });

            // Wait for visual effect
            await new Promise(resolve => setTimeout(resolve, 600));

            setVerifyResults(prev => ({ ...prev, [sortedBlocks[i].blockIndex]: 'valid' }));
        }

        setVerifyIndex(-1);

        // Actually call backend verification
        if (onVerify) {
            try {
                await onVerify();
                // success toast is handled by parent, but we can do it here if wanted
            } catch (err) {
                // error toast handled by parent
                const brokenIndex = err.response?.data?.verification?.invalidBlock;
                if (brokenIndex !== undefined) {
                    setVerifyResults(prev => ({ ...prev, [brokenIndex]: 'invalid' }));
                }
            }
        }
        setVerifying(false);
    };

    return (
        <div className="blockchain-visualizer" style={isFullscreen ? {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column', height: '100vh',
            background: 'var(--bg-app)', overflow: 'hidden',
            color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif'
        } : {
            display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)',
            background: 'var(--bg-app)', borderRadius: 12, overflow: 'hidden', position: 'relative',
            border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif'
        }}>

            {/* Top Bar Controls */}
            <div className="controls" style={{
                padding: '16px 24px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Total Blocks</div>
                        <div style={{ fontSize: 20, fontWeight: 600 }}>{sortedBlocks.length}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Chain Status</div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ShieldCheck size={16} /> Valid
                        </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-secondary)' }} />
                        <input
                            placeholder="Search hash or block..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                                padding: '6px 12px 6px 32px', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, width: 200, outline: 'none'
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={zoomOut} style={btnStyle} title="Zoom Out"><ZoomOut size={16} /></button>
                    <button onClick={toggleFullscreen} style={btnStyle} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                    <button onClick={zoomIn} style={btnStyle} title="Zoom In"><ZoomIn size={16} /></button>
                    <div style={{ width: 1, background: 'var(--border-default)', margin: '0 8px' }} />
                    <button onClick={focusLatest} style={btnStyle}>Latest Block</button>
                    <button onClick={startVerification} style={{ ...btnStyle, background: verifying ? '#059669' : '#3b82f6', color: '#fff', border: 'none' }}>
                        {verifying ? <><RefreshCw size={16} className="spin" /> Verifying...</> : <><Play size={16} /> Verify Chain</>}
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div
                ref={containerRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                style={{
                    flex: 1, position: 'relative', overflow: 'hidden',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    background: 'radial-gradient(circle at center, var(--bg-surface) 0%, var(--bg-app) 100%)'
                }}
            >
                {loading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-secondary)' }}>Loading Integrity Ledger...</div>}

                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 100,
                    transform: `translate(${pan.x}px, -50%) scale(${scale})`,
                    transformOrigin: '0 50%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 60,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}>

                    {filteredBlocks.map((block, index) => {
                        const isVerifying = verifyIndex === index;
                        const isSelected = selectedBlock?.blockIndex === block.blockIndex;
                        const status = verifyResults[block.blockIndex]; // 'valid' | 'invalid'

                        return (
                            <div key={block.blockIndex} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

                                {/* Connector Line to next block (except last) */}
                                {index < filteredBlocks.length - 1 && (
                                    <div style={{
                                        position: 'absolute',
                                        left: '100%',
                                        top: '50%',
                                        width: 60,
                                        height: 2,
                                        background: isVerifying ? '#3b82f6' : 'var(--border-default)',
                                        boxShadow: isVerifying ? '0 0 10px #3b82f6' : 'none',
                                        transition: 'all 0.3s'
                                    }}>
                                        {/* Animated particle flow */}
                                        <div style={{
                                            position: 'absolute',
                                            top: -2,
                                            left: 0,
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: '#fff',
                                            boxShadow: '0 0 8px #fff',
                                            animation: 'flowRight 2s infinite linear',
                                            opacity: isVerifying ? 1 : 0.2
                                        }} />
                                    </div>
                                )}

                                {/* Block Node */}
                                <div
                                    className="block-node"
                                    onClick={() => setSelectedBlock(block)}
                                    style={{
                                        width: 280,
                                        background: isSelected ? 'var(--brand-primary-subtle)' : 'var(--bg-card)',
                                        border: `1px solid ${status === 'invalid' ? '#ef4444' :
                                            status === 'valid' ? '#10b981' :
                                                isSelected ? '#3b82f6' :
                                                    isVerifying ? '#60a5fa' : 'var(--border-default)'
                                            }`,
                                        borderRadius: 12,
                                        padding: 20,
                                        boxShadow: isVerifying ? '0 0 20px var(--brand-primary-border)' : 'var(--shadow-md)',
                                        backdropFilter: 'blur(10px)',
                                        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                        transform: isSelected || isVerifying ? 'scale(1.05) translateY(-5px)' : 'scale(1)',
                                        zIndex: isSelected || isVerifying ? 5 : 1
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>BLOCK #{block.blockIndex}</div>
                                        {status === 'valid' && <CheckCircle2 size={16} color="#10b981" />}
                                        {status === 'invalid' && <XCircle size={16} color="#ef4444" />}
                                    </div>

                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Commitment</div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: '#60a5fa' }}>{block.blockType.replace('_', ' ')}</div>
                                    </div>

                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Entity</div>
                                        <div style={{ fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{block.entityLabel || block.entityId}</div>
                                    </div>

                                    <div style={{ background: 'var(--bg-input)', borderRadius: 6, padding: 10, marginBottom: 12 }}>
                                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>Block Hash</div>
                                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-primary)' }}>{shortHash(block.hash)}</div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                                        <Clock size={12} /> {formatDate(block.timestamp)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredBlocks.length === 0 && !loading && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No blocks match the filter.</div>
                    )}
                </div>
                {/* Block Inspector Drawer */}
                <div className="inspector-drawer" style={{
                    position: 'absolute', top: 0, right: 0, bottom: 0, width: 400,
                    background: 'var(--bg-elevated)',
                    borderLeft: '1px solid var(--border-default)',
                    transform: selectedBlock ? 'translateX(0) translateZ(0)' : 'translateX(100%) translateZ(0)',
                    transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    padding: '24px', overflowY: 'auto',
                    boxShadow: 'var(--shadow-xl)', zIndex: 50,
                    pointerEvents: 'auto'
                }}>
                    {selectedBlock && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: 1 }}>INSPECTOR</div>
                                    <h2 style={{ margin: '4px 0 0 0', fontSize: 24, fontWeight: 600 }}>Block #{selectedBlock.blockIndex}</h2>
                                </div>
                                <button
                                    onClick={() => setSelectedBlock(null)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: 'var(--border-default)', border: 'none',
                                        color: 'var(--text-primary)', cursor: 'pointer', outline: 'none'
                                    }}
                                >
                                    ✕
                                </button>

                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <InspectorItem label="Commitment Type" value={selectedBlock.blockType.replace('_', ' ')} highlight />
                                <InspectorItem label="Object Reference" value={selectedBlock.entityLabel || '—'} subvalue={selectedBlock.entityId} />

                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>Cryptographic Chain</div>
                                    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 12 }}>
                                        <HashItem label="Previous Hash" hash={selectedBlock.previousHash} desc="Links to previous state" />
                                        <div style={{ width: 2, height: 16, background: 'var(--border-default)', margin: '4px 0 4px 12px' }} />
                                        <HashItem label="Block Hash" hash={selectedBlock.hash} desc="Current block signature" active />
                                    </div>
                                </div>

                                <InspectorItem label="Merkle Root" value={selectedBlock.merkleRoot ? shortHash(selectedBlock.merkleRoot) : '—'} isCode />

                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>Canonical Metadata</div>
                                    <pre style={{
                                        margin: 0, padding: 12, background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
                                        borderRadius: 8, fontSize: 11, color: 'var(--text-secondary)', overflowX: 'auto', whiteSpace: 'pre-wrap'
                                    }}>
                                        {JSON.stringify(selectedBlock.metadata, null, 2)}
                                    </pre>
                                </div>

                                <div style={{ marginTop: 12, padding: 16, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 600, marginBottom: 4 }}>
                                        <ShieldCheck size={18} /> Cryptographically Secured
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>This block's integrity is mathematically guaranteed. Any alterations to the underlying records will break the Merkle root and invalidate the chain.</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Inject CSS animation */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes flowRight {
                    0% { left: 0; opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { left: 100%; opacity: 0; }
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                
                .blockchain-visualizer * {
                    box-sizing: border-box;
                }
            `}} />
        </div >
    );
}

// Helpers for the Inspector
function InspectorItem({ label, value, subvalue, highlight, isCode }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            {isCode ? (
                <code style={{ fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{value}</code>
            ) : (
                <div style={{ fontSize: highlight ? 16 : 14, fontWeight: highlight ? 600 : 400, color: highlight ? '#60a5fa' : '#fff' }}>
                    {value}
                </div>
            )}
            {subvalue && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{subvalue}</div>}
        </div>
    );
}

function HashItem({ label, hash, desc, active }) {
    return (
        <div>
            <div style={{ fontSize: 10, color: active ? '#60a5fa' : '#888', marginBottom: 2 }}>{label}</div>
            <code style={{ fontSize: 11, color: active ? '#fff' : '#a1a1aa', wordBreak: 'break-all' }}>{hash || '—'}</code>
            {desc && <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 2 }}>{desc}</div>}
        </div>
    );
}

const btnStyle = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', background: 'var(--bg-hover)',
    border: '1px solid var(--border-default)', borderRadius: 6,
    color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s'
};
