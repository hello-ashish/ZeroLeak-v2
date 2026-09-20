import React from 'react';
import BlockchainCenter from '../../components/blockchain/BlockchainCenter';
import { AdminLayout } from './AdminLayout';

export default function AdminBlockchainCenter() {
    return (
        <AdminLayout>
            <BlockchainCenter />
        </AdminLayout>
    );
}
