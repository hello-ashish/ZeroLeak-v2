import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { AdminLayout } from './AdminLayout.jsx'
import BlockchainVisualizer from '../../components/BlockchainVisualizer.jsx'
import { useToast } from '../../components/Toast.jsx'

const API = 'http://localhost:4000/api'
const getToken = () => localStorage.getItem('adminToken')

export default function AdminBlockchainVisualizerPage() {
    const [blocks, setBlocks] = useState([])
    const [loading, setLoading] = useState(true)
    const toast = useToast()

    const auth = { headers: { Authorization: `Bearer ${getToken()}` } }

    const load = async () => {
        try {
            setLoading(true)
            // Load a large chunk of the ledger for visualization
            const ledger = await axios.get(`${API}/blockchain/ledger?limit=500`, auth)
            setBlocks(ledger.data.blocks || [])
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load blockchain ledger')
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        // Trigger verification API
        await axios.get(`${API}/blockchain/verify`, auth)
        // Let the component handle the local toast on success, or throw the error up
    }

    useEffect(() => { load() }, [])

    return (
        <AdminLayout>
            <div className="page-header" style={{ marginBottom: 18 }}>
                <div className="page-header-top">
                    <div>
                        <h1 className="page-title">Blockchain Visualizer</h1>
                        <p className="page-subtitle">Explore and verify the cryptographic history of ZeroLeak.</p>
                    </div>
                </div>
            </div>

            <BlockchainVisualizer 
                blocks={blocks} 
                loading={loading} 
                onVerify={handleVerify} 
            />
        </AdminLayout>
    )
}
