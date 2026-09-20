import React, { useEffect, useRef } from 'react';
import { ScrollText } from 'lucide-react';

export default function MockSimulationLog({ logs }) {
    const endRef = useRef(null);

    useEffect(() => {
        if (endRef.current) {
            endRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    return (
        <div className="card mock-simulation-log">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-default)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ScrollText size={16} style={{ color: 'var(--text-tertiary)' }}/>
                <h3 className="card-title" style={{ fontSize: '0.9rem' }}>SIMULATION LOG</h3>
            </div>
            <div className="card-body terminal-body">
                {logs.map((log, i) => (
                    <div key={i} className="log-entry">
                        <span className="log-time">[{log.time}]</span>
                        <span className={`log-msg ${log.msg.includes('⚠') ? 'text-danger' : log.msg.includes('✓') ? 'text-success' : ''}`}>
                            {log.msg}
                        </span>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
}
