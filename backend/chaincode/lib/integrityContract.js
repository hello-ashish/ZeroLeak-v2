'use strict';

const { Contract } = require('fabric-contract-api');

class IntegrityContract extends Contract {

    /**
     * Initialize the ledger with empty state.
     */
    async initLedger(ctx) { // ctx = context
        console.info('============= START : Initialize Ledger ===========');

        const genesisRecord = {
            eventId: 'GENESIS',
            commitmentType: 'GENESIS',
            canonicalHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
            payload: 'GENESIS_PAYLOAD',
            txId: ctx.stub.getTxID(),
            timestamp: new Date((ctx.stub.getTxTimestamp().seconds.low) * 1000).toISOString(),
            height: 0
        };

        await ctx.stub.putState('GENESIS', Buffer.from(JSON.stringify(genesisRecord)));
        await ctx.stub.putState('LEDGER_HEIGHT', Buffer.from('0'));

        console.info('============= END : Initialize Ledger ===========');
    }

    /**
     * Commit a new integrity record.
     */
    async commitIntegrityRecord(ctx, eventId, commitmentType, canonicalHash, payloadString) {
        console.info('============= START : commitIntegrityRecord ===========');

        // Check if record already exists to ensure idempotency and prevent overwrite
        const exists = await this.recordExists(ctx, eventId);
        if (exists) {
            throw new Error(`The integrity record ${eventId} already exists.`);
        }

        const heightBytes = await ctx.stub.getState('LEDGER_HEIGHT');
        let currentHeight = 0;
        if (heightBytes && heightBytes.length > 0) {
            currentHeight = parseInt(heightBytes.toString());
        }

        const txId = ctx.stub.getTxID();
        const timestamp = new Date((ctx.stub.getTxTimestamp().seconds.low) * 1000).toISOString();

        const record = {
            eventId,
            commitmentType,
            canonicalHash,
            payloadString,
            txId,
            timestamp,
            height: currentHeight + 1,
        };

        await ctx.stub.putState(eventId, Buffer.from(JSON.stringify(record)));
        await ctx.stub.putState('LEDGER_HEIGHT', Buffer.from((currentHeight + 1).toString()));

        // We can also index it by height if needed
        await ctx.stub.putState(`HEIGHT_${currentHeight + 1}`, Buffer.from(eventId));

        console.info('============= END : commitIntegrityRecord ===========');

        return JSON.stringify({ txId, height: currentHeight + 1, status: 'SUCCESS' });
    }

    /**
     * Retrieve an integrity record.
     */
    async getIntegrityRecord(ctx, eventId) {
        const recordBytes = await ctx.stub.getState(eventId);
        if (!recordBytes || recordBytes.length === 0) {
            throw new Error(`The integrity record ${eventId} does not exist.`);
        }
        return recordBytes.toString();
    }

    /**
     * Retrieve the current ledger height.
     */
    async getLedgerHeight(ctx) {
        const heightBytes = await ctx.stub.getState('LEDGER_HEIGHT');
        if (!heightBytes || heightBytes.length === 0) {
            return "0";
        }
        return heightBytes.toString();
    }

    /**
     * Retrieve recent ledger history based on height.
     */
    async getLedgerHistory(ctx, limitStr) {
        const limit = parseInt(limitStr) || 100;
        const currentHeightStr = await this.getLedgerHeight(ctx);
        const currentHeight = parseInt(currentHeightStr);

        let records = [];
        let count = 0;

        for (let i = currentHeight; i > 0 && count < limit; i--) {
            const eventIdBytes = await ctx.stub.getState(`HEIGHT_${i}`);
            if (eventIdBytes && eventIdBytes.length > 0) {
                const eventId = eventIdBytes.toString();
                const recordBytes = await ctx.stub.getState(eventId);
                if (recordBytes && recordBytes.length > 0) {
                    records.push(JSON.parse(recordBytes.toString()));
                }
            }
            count++;
        }

        return JSON.stringify(records);
    }

    /**
     * Helper to check existence.
     */
    async recordExists(ctx, eventId) {
        const recordBytes = await ctx.stub.getState(eventId);
        return recordBytes && recordBytes.length > 0;
    }
}

module.exports = IntegrityContract;
