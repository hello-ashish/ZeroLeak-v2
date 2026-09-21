import { getFabricContract } from "./fabricGateway.service.js";

// Basic fallback for development
const MOCK_LEDGER = [];

export async function commitIntegrityRecord(eventId, commitmentType, canonicalHash, payloadString) {
    if (process.env.BLOCKCHAIN_MODE === 'mock') {
        const txId = `mock-tx-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const height = MOCK_LEDGER.length + 1;
        const record = {
            eventId,
            commitmentType,
            canonicalHash,
            payloadString,
            txId,
            height,
            timestamp: new Date().toISOString()
        };
        MOCK_LEDGER.push(record);
        return JSON.stringify({ txId, height, status: 'SUCCESS' });
    }

    const contract = await getFabricContract();
    try {
        const commitResult = await contract.submitTransaction('commitIntegrityRecord', eventId, commitmentType, canonicalHash, payloadString);
        return Buffer.from(commitResult).toString('utf8');
    } catch (error) {
        console.error(`[Fabric] Error committing record ${eventId}:`, error);
        throw error;
    }
}

export async function getIntegrityRecord(eventId) {
    if (process.env.BLOCKCHAIN_MODE === 'mock') {
        return MOCK_LEDGER.find(r => r.eventId === eventId) || null;
    }

    const contract = await getFabricContract();
    const result = await contract.evaluateTransaction('getIntegrityRecord', eventId);
    return JSON.parse(Buffer.from(result).toString('utf8'));
}

export async function getLedgerHistory(limit = 100) {
    if (process.env.BLOCKCHAIN_MODE === 'mock') {
        return MOCK_LEDGER.slice(-limit).reverse();
    }

    const contract = await getFabricContract();
    const result = await contract.evaluateTransaction('getLedgerHistory', limit.toString());
    return JSON.parse(Buffer.from(result).toString('utf8'));
}

export async function getLedgerHeight() {
    if (process.env.BLOCKCHAIN_MODE === 'mock') {
        return MOCK_LEDGER.length;
    }

    const contract = await getFabricContract();
    const result = await contract.evaluateTransaction('getLedgerHeight');
    return parseInt(Buffer.from(result).toString('utf8'), 10);
}

export async function isFabricConnected() {
    if (process.env.BLOCKCHAIN_MODE === 'mock') {
        return true;
    }
    
    try {
        const contract = await getFabricContract();
        return contract !== null;
    } catch {
        return false;
    }
}
