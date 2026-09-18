import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { AdminLayout } from './AdminLayout.jsx'
import { ShieldCheck, ShieldAlert, RefreshCw, Link2, Blocks, Clock3, Hash, Search, ChevronRight } from 'lucide-react'
import { useToast } from '../../components/Toast.jsx'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('adminToken')

const shortHash = (value) => value ? `${value.slice(0, 12)}…${value.slice(-10)}` : '—'
const formatDate = (value) => value ? new Date(value).toLocaleString() : '—'

export default function AdminBlockchainPage() {
    const [blocks, setBlocks] = useState([])
    const [status, setStatus] = useState(null)
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(true)
    const [verifying, setVerifying] = useState(false)
    const [search, setSearch] = useState('')
    const toast = useToast()

    const auth = { headers: { Authorization: `Bearer ${getToken()}` } }

    const load = async () => {
        try {
            setLoading(true)
            const [ledger, state] = await Promise.all([
                axios.get(`${API}/admin/blockchain/ledger?limit=100`, auth),
                axios.get(`${API}/admin/blockchain/status`, auth),
            ])
            setBlocks(ledger.data.blocks || [])
            setStatus(state.data)
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load blockchain ledger')
        } finally {
            setLoading(false)
        }
    }

    const verify = async () => {
        try {
            setVerifying(true)
            const response = await axios.get(`${API}/admin/blockchain/verify`, auth)
            toast.success('Blockchain verified — all blocks are valid')
            setStatus(prev => ({ ...prev, ...response.data.verification, integrity: true }))
        } catch (error) {
            const verification = error.response?.data?.verification
            if (verification) {
                setStatus(prev => ({ ...prev, ...verification, integrity: false }))
                toast.error(`Integrity failure at block ${verification.invalidBlock}: ${verification.reason}`)
            } else {
                toast.error('Blockchain verification failed')
            }
        } finally {
            setVerifying(false)
        }
    }

    const openBlock = async (index) => {
        try {
            const response = await axios.get(`${API}/admin/blockchain/blocks/${index}`, auth)
            setSelected(response.data.block)
        } catch {
            toast.error('Unable to load block details')
        }
    }

    useEffect(() => { load() }, [])

    const filtered = blocks.filter(block => {
        const q = search.trim().toLowerCase()
        if (!q) return true
        return [block.blockIndex, block.blockType, block.entityId, block.entityLabel, block.hash, block.merkleRoot]
            .some(value => String(value ?? '').toLowerCase().includes(q))
    })

    return (
        <AdminLayout>
            <div className="page-header" style={{ marginBottom: 18 }}>
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Blockchain Ledger</h1>
                        <p className="page-subtitle">Tamper-evident commitments for protected question batches and exams</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={15} /> Refresh</button>
                        <button className="btn btn-primary" onClick={verify} disabled={verifying}><ShieldCheck size={15} /> {verifying ? 'Verifying…' : 'Verify Chain'}</button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14, marginBottom: 18 }}>
                <div className="kpi-card"><div className="kpi-card-header"><span className="kpi-label">Network</span><Link2 size={18} /></div><div className="kpi-value" style={{ fontSize: 18 }}>Permissioned V1</div><div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>MongoDB-backed ledger</div></div>
                <div className="kpi-card"><div className="kpi-card-header"><span className="kpi-label">Blocks</span><Blocks size={18} /></div><div className="kpi-value">{status?.blockCount ?? '—'}</div><div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Latest #{status?.latestBlock ?? '—'}</div></div>
                <div className="kpi-card"><div className="kpi-card-header"><span className="kpi-label">Chain Status</span>{status?.integrity ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}</div><div className="kpi-value" style={{ fontSize: 18 }}>{status ? (status.integrity ? 'VALID' : 'COMPROMISED') : '—'}</div><div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{status?.verification?.reason || 'Run verification'}</div></div>
                <div className="kpi-card"><div className="kpi-card-header"><span className="kpi-label">Latest Hash</span><Hash size={18} /></div><div className="kpi-value" style={{ fontSize: 13, fontFamily: 'monospace' }}>{shortHash(status?.latestHash)}</div><div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Cryptographic chain tip</div></div>
            </div>

            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="search-input-wrap" style={{ marginBottom: 12, maxWidth: 420 }}><Search size={16} /><input className="search-input" placeholder="Search blocks, batches, hashes…" value={search} onChange={e => setSearch(e.target.value)} /></div>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead><tr><th>Block</th><th>Type</th><th>Entity</th><th>Merkle Root</th><th>Block Hash</th><th>Timestamp</th><th /></tr></thead>
                            <tbody>
                                {loading ? <tr><td colSpan="7" style={{ padding: 40, textAlign: 'center' }}>Loading ledger…</td></tr> : filtered.length === 0 ? <tr><td colSpan="7" style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>No blocks found.</td></tr> : filtered.map(block => (
                                    <tr key={block._id} onClick={() => openBlock(block.blockIndex)} style={{ cursor: 'pointer' }}>
                                        <td><strong>#{block.blockIndex}</strong></td>
                                        <td><span className="badge badge-neutral">{block.blockType.replace('_', ' ')}</span></td>
                                        <td><div style={{ fontWeight: 600 }}>{block.entityLabel || block.entityId}</div><div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{block.entityId}</div></td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{shortHash(block.merkleRoot)}</td>
                                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{shortHash(block.hash)}</td>
                                        <td><div style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 11 }}><Clock3 size={12} />{formatDate(block.timestamp)}</div></td>
                                        <td><ChevronRight size={15} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {selected && (
                    <aside style={{ width: 380, flexShrink: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 20, position: 'sticky', top: 80 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><div><div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>BLOCK</div><h2 style={{ margin: 0 }}>#{selected.blockIndex}</h2></div><button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>Close</button></div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div><div className="kpi-label">Type</div><strong>{selected.blockType.replace('_', ' ')}</strong></div>
                            <div><div className="kpi-label">Entity</div><strong>{selected.entityLabel || '—'}</strong><div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{selected.entityId}</div></div>
                            <div><div className="kpi-label">Merkle Root</div><code style={{ wordBreak: 'break-all', fontSize: 11 }}>{selected.merkleRoot || '—'}</code></div>
                            <div><div className="kpi-label">Commitment Hash</div><code style={{ wordBreak: 'break-all', fontSize: 11 }}>{selected.commitmentHash}</code></div>
                            <div><div className="kpi-label">Previous Hash</div><code style={{ wordBreak: 'break-all', fontSize: 11 }}>{selected.previousHash}</code></div>
                            <div><div className="kpi-label">Current Hash</div><code style={{ wordBreak: 'break-all', fontSize: 11 }}>{selected.hash}</code></div>
                            <div><div className="kpi-label">Timestamp</div><span>{formatDate(selected.timestamp)}</span></div>
                            <div><div className="kpi-label">Safe Metadata</div><pre style={{ margin: 0, padding: 10, background: 'var(--bg-surface)', borderRadius: 6, overflow: 'auto', fontSize: 10 }}>{JSON.stringify(selected.metadata, null, 2)}</pre></div>
                        </div>
                    </aside>
                )}
            </div>
        </AdminLayout>
    )
}
