import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/integrityOutbox.models.js', () => ({
    IntegrityOutbox: {
        findOne: jest.fn()
    }
}));

jest.unstable_mockModule('../private/privateBlockchain.service.js', () => ({
    getLedgerHistory: jest.fn(),
    getLedgerHeight: jest.fn(),
    isFabricConnected: jest.fn(),
    getIntegrityRecord: jest.fn()
}));

jest.unstable_mockModule('../commitment.service.js', () => ({
    sha256: jest.fn((val) => val + "_hashed"),
    canonicalize: jest.fn((val) => val),
    recomputeEntityHash: jest.fn(),
    createCommitment: jest.fn()
}));

let mockRes;
let verifyBlockchainLedger, verifyEntityCommitment;
let IntegrityOutbox;
let getLedgerHistory, getLedgerHeight, isFabricConnected, getIntegrityRecord;
let recomputeEntityHash, sha256;

describe('Blockchain Verification Endpoints', () => {
    beforeAll(async () => {
        const controllers = await import('../../controllers/blockchain.controllers.js');
        verifyBlockchainLedger = controllers.verifyBlockchainLedger;
        verifyEntityCommitment = controllers.verifyEntityCommitment;
        
        const pb = await import('../private/privateBlockchain.service.js');
        getLedgerHistory = pb.getLedgerHistory;
        getLedgerHeight = pb.getLedgerHeight;
        isFabricConnected = pb.isFabricConnected;
        getIntegrityRecord = pb.getIntegrityRecord;
        
        const io = await import('../../models/integrityOutbox.models.js');
        IntegrityOutbox = io.IntegrityOutbox;

        const cs = await import('../commitment.service.js');
        recomputeEntityHash = cs.recomputeEntityHash;
        sha256 = cs.sha256;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock res object
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('verifyBlockchainLedger', () => {
        it('should return connection failure if not connected', async () => {
            isFabricConnected.mockResolvedValue(false);
            
            await verifyBlockchainLedger({ query: {} }, mockRes);
            
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                verification: expect.objectContaining({ valid: false, reason: "Not connected to Fabric ledger." })
            }));
        });

        it('should detect sequence gap', async () => {
            isFabricConnected.mockResolvedValue(true);
            getLedgerHeight.mockResolvedValue(2);
            getLedgerHistory.mockResolvedValue([
                { height: 1, payloadString: '{"test":1}', canonicalHash: '{"test":1}_hashed', eventId: 'ev1' },
                { height: 3, payloadString: '{"test":2}', canonicalHash: '{"test":2}_hashed', eventId: 'ev2' } // Gap!
            ]);
            
            await verifyBlockchainLedger({ query: {} }, mockRes);
            
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                verification: expect.objectContaining({ valid: false, reason: "Sequence gap detected at height 3" })
            }));
        });

        it('should detect malformed payload', async () => {
            isFabricConnected.mockResolvedValue(true);
            getLedgerHistory.mockResolvedValue([
                { height: 1, payloadString: 'bad json', canonicalHash: 'hash', eventId: 'ev1' }
            ]);
            
            await verifyBlockchainLedger({ query: {} }, mockRes);
            
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                verification: expect.objectContaining({ valid: false, reason: "Malformed record payload at height 1" })
            }));
        });

        it('should detect hash mismatch', async () => {
            isFabricConnected.mockResolvedValue(true);
            getLedgerHistory.mockResolvedValue([
                { height: 1, payloadString: '{"test":1}', canonicalHash: 'wronghash', eventId: 'ev1' }
            ]);
            
            await verifyBlockchainLedger({ query: {} }, mockRes);
            
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                verification: expect.objectContaining({ valid: false, reason: "Hash mismatch at height 1 (Event: ev1)" })
            }));
        });

        it('should fully verify a correct ledger', async () => {
            isFabricConnected.mockResolvedValue(true);
            getLedgerHeight.mockResolvedValue(2);
            getLedgerHistory.mockResolvedValue([
                { height: 1, payloadString: '{"test":1}', canonicalHash: '{"test":1}_hashed', eventId: 'ev1' },
                { height: 2, payloadString: '{"test":2}', canonicalHash: '{"test":2}_hashed', eventId: 'ev2' }
            ]);
            
            await verifyBlockchainLedger({ query: {} }, mockRes);
            
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                verification: expect.objectContaining({ valid: true, checkedBlocks: 2 })
            }));
        });
    });

    describe('verifyEntityCommitment', () => {
        it('should return 404 if no outbox record exists', async () => {
            IntegrityOutbox.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
            await verifyEntityCommitment({ params: { entityId: '123' } }, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should detect fabric record hash mismatch (internal compromise)', async () => {
            IntegrityOutbox.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ status: 'CONFIRMED', eventId: 'ev1' }) });
            getIntegrityRecord.mockResolvedValue({ payloadString: '{"test":1}', canonicalHash: 'wronghash' });
            
            await verifyEntityCommitment({ params: { entityId: '123' } }, mockRes);
            
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                verified: false,
                message: "Ledger integrity compromised: Hash mismatch in Fabric record."
            }));
        });

        it('should detect mongodb database tampering', async () => {
            IntegrityOutbox.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ status: 'CONFIRMED', eventId: 'ev1' }) });
            getIntegrityRecord.mockResolvedValue({ payloadString: '{"test":1}', canonicalHash: '{"test":1}_hashed' });
            recomputeEntityHash.mockResolvedValue("tampered_hash");
            
            await verifyEntityCommitment({ params: { entityId: '123' } }, mockRes);
            
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                verified: false,
                message: "Database tampering detected: Current entity state does not match committed hash."
            }));
        });

        it('should fully verify matching entity', async () => {
            IntegrityOutbox.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ status: 'CONFIRMED', eventId: 'ev1' }) });
            getIntegrityRecord.mockResolvedValue({ payloadString: '{"test":1}', canonicalHash: '{"test":1}_hashed' });
            recomputeEntityHash.mockResolvedValue('{"test":1}_hashed');
            
            await verifyEntityCommitment({ params: { entityId: '123' } }, mockRes);
            
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                verified: true,
                message: "Cryptographic commitment verified successfully. Data integrity confirmed."
            }));
        });
    });
});
