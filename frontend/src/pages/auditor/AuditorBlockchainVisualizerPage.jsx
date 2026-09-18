import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { AuditorLayout } from './AuditorLayout.jsx'
import BlockchainVisualizer from '../../components/BlockchainVisualizer.jsx'
import { useToast } from '../../components/Toast.jsx'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('auditorToken')

export default function AuditorBlockchainVisualizerPage() {
    const [blocks, setBlocks] = useState([])
    const [loading, setLoading] = useState(true)
    const toast = useToast()

    const auth = { headers: { Authorization: `Bearer ${getToken()}` } }

    const load = async () => {
        try {
            setLoading(true)
            const ledger = await axios.get(`${API}/blockchain/ledger?limit=500`, auth)
            setBlocks(ledger.data.blocks || [])
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load blockchain ledger')
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        await axios.get(`${API}/blockchain/verify`, auth)
    }

    useEffect(() => { load() }, [])

    return (
        <AuditorLayout>
            <div className="page-header" style={{ marginBottom: 18 }}>
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Ledger Visualizer</h1>
                        <p className="page-subtitle">Inspect the cryptographic chain and verify integrity.</p>
                    </div>
                </div>
            </div>

            <BlockchainVisualizer 
                blocks={blocks} 
                loading={loading} 
                onVerify={handleVerify} 
            />
        </AuditorLayout>
    )
}
