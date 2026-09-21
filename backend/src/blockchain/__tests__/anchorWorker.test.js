import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../models/anchorState.models.js', () => ({
    AnchorState: {
        findOneAndUpdate: jest.fn(),
        updateOne: jest.fn()
    }
}));

jest.unstable_mockModule('../private/privateBlockchain.service.js', () => ({
    getLedgerHeight: jest.fn(),
    getLedgerHistory: jest.fn()
}));

jest.unstable_mockModule('../public/anchor.service.js', () => ({
    submitPolygonAnchor: jest.fn(),
    getPolygonAnchor: jest.fn()
}));

jest.unstable_mockModule('../../Services/merkle.service.js', () => ({
    buildMerkleRoot: jest.fn().mockReturnValue('0xmockroot')
}));

let processAnchor;
let mockGetLedgerHeight;
let mockGetLedgerHistory;
let mockSubmitPolygonAnchor;
let mockGetPolygonAnchor;
let AnchorState;

describe('AnchorWorker Persistence and Idempotency', () => {
    beforeAll(async () => {
        const workerModule = await import('../workers/anchorWorker.service.js');
        processAnchor = workerModule.processAnchor;

        const pbModule = await import('../private/privateBlockchain.service.js');
        mockGetLedgerHeight = pbModule.getLedgerHeight;
        mockGetLedgerHistory = pbModule.getLedgerHistory;

        const aModule = await import('../public/anchor.service.js');
        mockSubmitPolygonAnchor = aModule.submitPolygonAnchor;
        mockGetPolygonAnchor = aModule.getPolygonAnchor;
        
        const amModule = await import('../../models/anchorState.models.js');
        AnchorState = amModule.AnchorState;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize from public chain when local state is uninitialized', async () => {
        AnchorState.findOneAndUpdate.mockImplementation(async (query, update) => {
            return { sequence: 0, lastAnchoredHeight: -1, lockedBy: update.$set.lockedBy };
        });
        AnchorState.updateOne.mockResolvedValue({ modifiedCount: 1 });
        
        mockGetPolygonAnchor.mockResolvedValue({ sequence: 5, height: 10, ledgerHash: '0x1', root: '0x2', timestamp: 12345 });
        mockGetLedgerHeight.mockResolvedValue(15);
        mockGetLedgerHistory.mockResolvedValue([{ canonicalHash: '0xabc' }]);
        mockSubmitPolygonAnchor.mockResolvedValue('0xtxhash');

        await processAnchor();

        expect(mockGetPolygonAnchor).toHaveBeenCalledTimes(1);
        expect(mockSubmitPolygonAnchor).toHaveBeenCalledWith(6, 15, expect.any(String), expect.any(String));
        
        // Assert lock release and state update
        expect(AnchorState.updateOne).toHaveBeenCalledWith(
            expect.objectContaining({ _id: "global" }),
            { $set: expect.objectContaining({ lockedAt: null, sequence: 6, lastAnchoredHeight: 15 }) }
        );
    });

    it('should NOT initialize from public chain if local state is already initialized', async () => {
        AnchorState.findOneAndUpdate.mockImplementation(async (query, update) => {
            return { sequence: 10, lastAnchoredHeight: 50, lockedBy: update.$set.lockedBy };
        });
        
        mockGetLedgerHeight.mockResolvedValue(60);
        mockGetLedgerHistory.mockResolvedValue([{ canonicalHash: '0xabc' }]);
        mockSubmitPolygonAnchor.mockResolvedValue('0xtxhash');

        await processAnchor();

        expect(mockGetPolygonAnchor).not.toHaveBeenCalled();
        expect(mockSubmitPolygonAnchor).toHaveBeenCalledWith(11, 60, expect.any(String), expect.any(String));
    });

    it('should prevent overlapping executions with distributed lock', async () => {
        // Return null to simulate lock held by someone else
        AnchorState.findOneAndUpdate.mockResolvedValue(null);
        
        mockGetLedgerHeight.mockResolvedValue(20);

        await processAnchor();

        // Execution should be aborted, submitPolygonAnchor should not be called
        expect(mockGetLedgerHeight).not.toHaveBeenCalled();
        expect(mockSubmitPolygonAnchor).not.toHaveBeenCalled();
        expect(AnchorState.updateOne).not.toHaveBeenCalled();
    });

    it('should not advance local state if chain submission fails', async () => {
        AnchorState.findOneAndUpdate.mockImplementation(async (query, update) => {
            return { sequence: 5, lastAnchoredHeight: 10, lockedBy: update.$set.lockedBy };
        });
        AnchorState.updateOne.mockResolvedValue({ modifiedCount: 1 });
        
        mockGetLedgerHeight.mockResolvedValue(20);
        mockGetLedgerHistory.mockResolvedValue([{ canonicalHash: '0xabc' }]);
        
        // Simulate submission failure
        mockSubmitPolygonAnchor.mockRejectedValue(new Error('Polygon network timeout'));

        await processAnchor();

        // State should remain unchanged in updateOne
        expect(AnchorState.updateOne).toHaveBeenCalledWith(
            expect.objectContaining({ _id: "global" }),
            { $set: expect.objectContaining({ sequence: 5, lastAnchoredHeight: 10 }) }
        );
    });

    it('should force sync next run if chain submission fails due to sequence mismatch', async () => {
        AnchorState.findOneAndUpdate.mockImplementation(async (query, update) => {
            return { sequence: 5, lastAnchoredHeight: 10, lockedBy: update.$set.lockedBy };
        });
        AnchorState.updateOne.mockResolvedValue({ modifiedCount: 1 });
        
        mockGetLedgerHeight.mockResolvedValue(20);
        mockGetLedgerHistory.mockResolvedValue([{ canonicalHash: '0xabc' }]);
        
        // Simulate sequence error
        mockSubmitPolygonAnchor.mockRejectedValue(new Error('Checkpoint sequence must be monotonically increasing.'));

        await processAnchor();

        // The error handler should set lastAnchoredHeight to -1 to force sync on next tick
        expect(AnchorState.updateOne).toHaveBeenCalledWith(
            expect.objectContaining({ _id: "global" }),
            { $set: expect.objectContaining({ sequence: 5, lastAnchoredHeight: -1 }) }
        );
    });
});
