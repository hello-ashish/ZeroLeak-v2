import { getFabricContract } from "./fabricGateway.service.js";

// Basic fallback for development if Fabric isn't running
const MOCK_LEDGER = [];

export async function commitIntegrityRecord(eventId, commitmentType, canonicalHash, payloadString) {
    const contract = await getFabricContract();
    
    if (contract) {
        try {
            const commitResult = await contract.submitTransaction('commitIntegrityRecord', eventId, commitmentType, canonicalHash, payloadString);
            return Buffer.from(commitResult).toString('utf8');
        } catch (error) {
            console.error(`[Fabric] Error committing record ${eventId}:`, error);
            throw error;
        }
    } else {
        // Mock fallback ONLY when Fabric is unavailable in local dev
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
}

export async function getIntegrityRecord(eventId) {
    const contract = await getFabricContract();
    
    if (contract) {
        const result = await contract.evaluateTransaction('getIntegrityRecord', eventId);
        return JSON.parse(Buffer.from(result).toString('utf8'));
    } else {
        return MOCK_LEDGER.find(r => r.eventId === eventId) || null;
    }
}

export async function getLedgerHistory(limit = 100) {
    const contract = await getFabricContract();
    
    if (contract) {
        const result = await contract.evaluateTransaction('getLedgerHistory', limit.toString());
        return JSON.parse(Buffer.from(result).toString('utf8'));
    } else {
        return MOCK_LEDGER.slice(-limit).reverse();
    }
}

export async function getLedgerHeight() {
    const contract = await getFabricContract();
    
    if (contract) {
        const result = await contract.evaluateTransaction('getLedgerHeight');
        return parseInt(Buffer.from(result).toString('utf8'), 10);
    } else {
        return MOCK_LEDGER.length;
    }
}

export async function isFabricConnected() {
    const contract = await getFabricContract();
    return contract !== null;
}
