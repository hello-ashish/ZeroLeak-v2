import { jest } from '@jest/globals';

const mockCommitIntegrityRecord = jest.fn();
const mockGetIntegrityRecord = jest.fn();

jest.unstable_mockModule('../private/privateBlockchain.service.js', () => ({
    commitIntegrityRecord: mockCommitIntegrityRecord,
    getIntegrityRecord: mockGetIntegrityRecord
}));

const mockFindOneAndUpdate = jest.fn();
const mockSave = jest.fn();
const mockUpdateMany = jest.fn();

jest.unstable_mockModule('../../models/integrityOutbox.models.js', () => ({
    IntegrityOutbox: {
        findOneAndUpdate: mockFindOneAndUpdate
    }
}));

jest.unstable_mockModule('../../models/auditlog.models.js', () => ({
    AuditLog: {
        updateMany: mockUpdateMany
    }
}));

const { processOutbox } = await import('../workers/outboxWorker.service.js');

describe('Outbox Worker Concurrency & Reliability', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSave.mockResolvedValue(true);
        mockUpdateMany.mockResolvedValue(true);
    });

    it('should successfully process a single pending record', async () => {
        const record = {
            _id: 'test_id',
            eventId: 'TEST_EVENT_1',
            status: 'PENDING',
            save: mockSave
        };

        // First call returns a record, second call returns null to break loop
        mockFindOneAndUpdate
            .mockResolvedValueOnce(record)
            .mockResolvedValueOnce(null);

        mockCommitIntegrityRecord.mockResolvedValueOnce(JSON.stringify({ txId: 'tx123' }));
        mockGetIntegrityRecord.mockRejectedValueOnce(new Error('Not found'));

        await processOutbox();

        expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(2);
        expect(mockCommitIntegrityRecord).toHaveBeenCalledTimes(1);
        expect(record.status).toBe('CONFIRMED');
        expect(record.privateTransactionId).toBe('tx123');
        expect(record.processingUntil).toBeNull();
        expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('should exponentially backoff on failure and retry later', async () => {
        const record = {
            _id: 'test_id',
            eventId: 'TEST_EVENT_2',
            status: 'PENDING',
            retryCount: 0,
            save: mockSave
        };

        mockFindOneAndUpdate
            .mockResolvedValueOnce(record)
            .mockResolvedValueOnce(null);

        mockCommitIntegrityRecord.mockRejectedValueOnce(new Error('Fabric network error'));
        mockGetIntegrityRecord.mockRejectedValueOnce(new Error('Not found'));

        await processOutbox();

        expect(record.status).toBe('PENDING'); // Should remain PENDING for retry
        expect(record.retryCount).toBe(1);
        expect(record.lastError).toBe('Fabric network error');
        expect(record.nextRetryAt).not.toBeNull();
        expect(record.processingUntil).toBeNull();

        const nextRetryMs = record.nextRetryAt.getTime() - Date.now();
        expect(nextRetryMs).toBeGreaterThan(1500);
        expect(nextRetryMs).toBeLessThan(2500);
    });

    it('should mark as FAILED after max retries', async () => {
        const record = {
            _id: 'test_id',
            eventId: 'TEST_EVENT_3',
            status: 'PENDING',
            retryCount: 4, // Next will be 5 (MAX)
            save: mockSave
        };

        mockFindOneAndUpdate
            .mockResolvedValueOnce(record)
            .mockResolvedValueOnce(null);

        mockCommitIntegrityRecord.mockRejectedValueOnce(new Error('Fabric network error'));
        mockGetIntegrityRecord.mockRejectedValueOnce(new Error('Not found'));

        await processOutbox();

        expect(record.status).toBe('FAILED');
        expect(record.retryCount).toBe(5);
        expect(record.processingUntil).toBeNull();
    });

    it('should recover a crashed worker lease', async () => {
        const record = {
            _id: 'test_id',
            eventId: 'TEST_EVENT_4',
            status: 'PROCESSING', // This was fetched from DB due to processingUntil < now
            processingUntil: new Date(Date.now() - 10000),
            save: mockSave
        };

        mockFindOneAndUpdate
            .mockResolvedValueOnce(record)
            .mockResolvedValueOnce(null);

        mockCommitIntegrityRecord.mockResolvedValueOnce(JSON.stringify({ txId: 'tx123' }));
        mockGetIntegrityRecord.mockRejectedValueOnce(new Error('Not found'));

        await processOutbox();

        expect(record.status).toBe('CONFIRMED');
        expect(record.privateTransactionId).toBe('tx123');
        expect(record.processingUntil).toBeNull();
    });
});
