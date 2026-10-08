import React from 'react';
import BlockchainCenter from '../../components/blockchain/BlockchainCenter';
import { AdminLayout } from './AdminLayout';

export default function AdminBlockchainCenter() {
    const token = localStorage.getItem('adminToken');
    return (
        <AdminLayout>
            <BlockchainCenter token={token} />
        </AdminLayout>
    );
}
