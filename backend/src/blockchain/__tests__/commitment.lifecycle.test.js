import { jest } from '@jest/globals';

jest.unstable_mockModule('../../models/integrityOutbox.models.js', () => ({
    IntegrityOutbox: {
        findOneAndUpdate: jest.fn(),
    }
}));

jest.unstable_mockModule('../../models/auditlog.models.js', () => ({
    AuditLog: {
        updateMany: jest.fn()
    }
}));

jest.unstable_mockModule('../private/privateBlockchain.service.js', () => ({
    commitIntegrityRecord: jest.fn(),
    getIntegrityRecord: jest.fn()
}));

let processOutbox;
let mockCommitIntegrityRecord;
let mockGetIntegrityRecord;
let IntegrityOutbox;
let AuditLog;

describe('Blockchain Commitment Lifecycle', () => {
    beforeAll(async () => {
        const workerModule = await import('../workers/outboxWorker.service.js');
        processOutbox = workerModule.processOutbox;

        const pbModule = await import('../private/privateBlockchain.service.js');
        mockCommitIntegrityRecord = pbModule.commitIntegrityRecord;
        mockGetIntegrityRecord = pbModule.getIntegrityRecord;
        
        const ioModule = await import('../../models/integrityOutbox.models.js');
        IntegrityOutbox = ioModule.IntegrityOutbox;
        
        const alModule = await import('../../models/auditlog.models.js');
        AuditLog = alModule.AuditLog;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully confirm a queued commitment', async () => {
        const mockSave = jest.fn();
        const outboxRecord = {
            eventId: 'TEST_EVENT_1',
            commitmentType: 'AUDIT_BATCH',
            canonicalHash: 'testhash',
            payload: { key: 'value' },
            status: 'PENDING',
            save: mockSave
        };
        
        // Mock query chain
        IntegrityOutbox.findOneAndUpdate.mockResolvedValueOnce(outboxRecord).mockResolvedValueOnce(null);

        mockGetIntegrityRecord.mockRejectedValue(new Error('Not found'));
        mockCommitIntegrityRecord.mockResolvedValue(JSON.stringify({ txId: '0xtx1', status: 'SUCCESS' }));

        await processOutbox();

        expect(mockSave).toHaveBeenCalled();
        expect(outboxRecord.status).toBe('CONFIRMED');
        expect(outboxRecord.privateTransactionId).toBe('0xtx1');

        expect(AuditLog.updateMany).toHaveBeenCalledWith(
            { outboxEventId: 'TEST_EVENT_1' },
            { $set: { commitmentStatus: "CONFIRMED", isCommitted: true } }
        );
    });

    it('should handle retries for failed commitments and not update AuditLog immediately', async () => {
        const mockSave = jest.fn();
        const outboxRecord = {
            eventId: 'TEST_EVENT_2',
            commitmentType: 'AUDIT_BATCH',
            canonicalHash: 'testhash',
            payload: { key: 'value' },
            status: 'PENDING',
            retryCount: 0,
            save: mockSave
        };
        
        IntegrityOutbox.findOneAndUpdate.mockResolvedValueOnce(outboxRecord).mockResolvedValueOnce(null);

        mockGetIntegrityRecord.mockRejectedValue(new Error('Not found'));
        mockCommitIntegrityRecord.mockRejectedValue(new Error('Fabric network timeout'));

        await processOutbox();

        expect(mockSave).toHaveBeenCalled();
        expect(outboxRecord.status).toBe('PENDING'); // Retryable
        expect(outboxRecord.retryCount).toBe(1);

        expect(AuditLog.updateMany).not.toHaveBeenCalled();
    });

    it('should transition to FAILED state after max retries and update AuditLog', async () => {
        const mockSave = jest.fn();
        const outboxRecord = {
            eventId: 'TEST_EVENT_3',
            commitmentType: 'AUDIT_BATCH',
            canonicalHash: 'testhash',
            payload: { key: 'value' },
            status: 'PENDING',
            retryCount: 4, // MAX_RETRIES is 5, so next one pushes it to 5
            save: mockSave
        };
        
        IntegrityOutbox.findOneAndUpdate.mockResolvedValueOnce(outboxRecord).mockResolvedValueOnce(null);

        mockGetIntegrityRecord.mockRejectedValue(new Error('Not found'));
        mockCommitIntegrityRecord.mockRejectedValue(new Error('Fabric network timeout'));

        await processOutbox();

        expect(mockSave).toHaveBeenCalled();
        expect(outboxRecord.status).toBe('FAILED');
        expect(outboxRecord.retryCount).toBe(5);

        expect(AuditLog.updateMany).toHaveBeenCalledWith(
            { outboxEventId: 'TEST_EVENT_3' },
            { $set: { commitmentStatus: "FAILED" } }
        );
    });

    it('should handle duplicate retry idempotency (recover lost ACK)', async () => {
        const mockSave = jest.fn();
        const outboxRecord = {
            eventId: 'TEST_EVENT_4',
            commitmentType: 'AUDIT_BATCH',
            canonicalHash: 'testhash',
            payload: { key: 'value' },
            status: 'PENDING',
            retryCount: 1,
            save: mockSave
        };
        
        IntegrityOutbox.findOneAndUpdate.mockResolvedValueOnce(outboxRecord).mockResolvedValueOnce(null);

        // Simulate that the record DOES exist on Fabric (worker crashed before ACK)
        mockGetIntegrityRecord.mockResolvedValue({ txId: '0xrecoveredtx' });

        await processOutbox();

        // It should NOT call commitIntegrityRecord again
        expect(mockCommitIntegrityRecord).not.toHaveBeenCalled();

        expect(mockSave).toHaveBeenCalled();
        expect(outboxRecord.status).toBe('CONFIRMED');
        expect(outboxRecord.privateTransactionId).toBe('0xrecoveredtx');

        expect(AuditLog.updateMany).toHaveBeenCalledWith(
            { outboxEventId: 'TEST_EVENT_4' },
            { $set: { commitmentStatus: "CONFIRMED", isCommitted: true } }
        );
    });
});
