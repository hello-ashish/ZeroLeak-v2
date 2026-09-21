import { jest } from '@jest/globals';

// We need to isolate modules to mock process.env correctly for each test
describe('Blockchain Fallback & Modes', () => {
    let privateBlockchainService;
    let fabricGatewayService;

    beforeEach(() => {
        jest.resetModules(); // clears the cache
        jest.clearAllMocks();
    });

    it('should use MOCK_LEDGER when BLOCKCHAIN_MODE=mock', async () => {
        process.env.BLOCKCHAIN_MODE = 'mock';

        // Mock fabricGateway so we can spy on it
        jest.unstable_mockModule('../fabricGateway.service.js', () => ({
            getFabricContract: jest.fn().mockRejectedValue(new Error('Should not be called in mock mode'))
        }));

        privateBlockchainService = await import('../privateBlockchain.service.js');
        const { commitIntegrityRecord, getLedgerHeight, isFabricConnected } = privateBlockchainService;
        
        const initialHeight = await getLedgerHeight();
        
        const resultStr = await commitIntegrityRecord('evt_1', 'TYPE', 'hash', 'payload');
        const result = JSON.parse(resultStr);

        expect(result.status).toBe('SUCCESS');
        expect(await getLedgerHeight()).toBe(initialHeight + 1);
        expect(await isFabricConnected()).toBe(true);
    });

    it('should THROW in production mode when Fabric is unavailable', async () => {
        process.env.BLOCKCHAIN_MODE = 'production';

        // We mock getFabricContract to simulate it throwing as it would in production when it can't find credentials
        jest.unstable_mockModule('../fabricGateway.service.js', () => ({
            getFabricContract: jest.fn().mockRejectedValue(new Error('Fabric connection failed'))
        }));

        privateBlockchainService = await import('../privateBlockchain.service.js');
        const { commitIntegrityRecord, getLedgerHeight, isFabricConnected } = privateBlockchainService;

        await expect(commitIntegrityRecord('evt_2', 'TYPE', 'hash', 'payload'))
            .rejects.toThrow('Fabric connection failed');

        await expect(getLedgerHeight())
            .rejects.toThrow('Fabric connection failed');

        expect(await isFabricConnected()).toBe(false);
    });
});
