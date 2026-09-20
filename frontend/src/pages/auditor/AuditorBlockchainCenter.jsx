import React from 'react';
import BlockchainCenter from '../../components/blockchain/BlockchainCenter';
import { AuditorLayout } from './AuditorLayout';

export default function AuditorBlockchainCenter() {
    return (
        <AuditorLayout>
            <BlockchainCenter />
        </AuditorLayout>
    );
}
