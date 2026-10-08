'use strict';

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import {
    IntegrityCommitment,
    VALID_EVENT_TYPES,
    VALID_ENTITY_TYPES,
    SHA256_PATTERN,
    COMMITMENT_ID_PATTERN,
    OBJECT_ID_PATTERN,
    EventType,
    EntityType,
} from './types';

@Info({ title: 'ZeroLeakIntegrityContract', description: 'ZeroLeak immutable integrity ledger' })
export class ZeroLeakIntegrityContract extends Contract {

    // -----------------------------------------------------------------------
    // initLedger
    // -----------------------------------------------------------------------
    @Transaction()
    public async initLedger(ctx: Context): Promise<void> {
        console.info('[ZeroLeak] initLedger: Initializing ledger with genesis record.');

        const genesisExists = await this._commitmentExists(ctx, 'GENESIS');
        if (genesisExists) {
            console.info('[ZeroLeak] initLedger: Genesis already exists, skipping.');
            return;
        }

        const genesis: IntegrityCommitment = {
            id: 'GENESIS',
            eventType: 'EXAM_COMMITMENT', // sentinel
            entityType: 'Exam',
            entityId: '000000000000000000000000',
            dataHash: '0'.repeat(64),
            previousCommitmentHash: '',
            version: 0,
            timestamp: new Date(ctx.stub.getTxTimestamp().seconds.toNumber() * 1000).toISOString(),
            application: 'ZeroLeak',
            txId: ctx.stub.getTxID(),
            blockTimestamp: new Date(ctx.stub.getTxTimestamp().seconds.toNumber() * 1000).toISOString(),
        };

        await ctx.stub.putState('GENESIS', Buffer.from(JSON.stringify(genesis)));
        await ctx.stub.putState('LEDGER_HEIGHT', Buffer.from('0'));

        console.info('[ZeroLeak] initLedger: Genesis record committed.');
    }

    // -----------------------------------------------------------------------
    // CreateCommitment
    // Writes a new integrity commitment to the ledger.
    // Rejects duplicates — a commitment ID can NEVER be overwritten.
    // -----------------------------------------------------------------------
    @Transaction()
    @Returns('string')
    public async CreateCommitment(
        ctx: Context,
        id: string,
        eventType: string,
        entityType: string,
        entityId: string,
        dataHash: string,
        previousCommitmentHash: string,
        version: string,
        timestamp: string,
    ): Promise<string> {
        console.info(`[ZeroLeak] CreateCommitment: id=${id}`);

        // --- Validate inputs independently. Never trust the application. ---
        this._validateCommitmentId(id);
        this._validateEventType(eventType as EventType);
        this._validateEntityType(entityType as EntityType);
        this._validateEntityId(entityId);
        this._validateDataHash(dataHash);
        this._validatePreviousHash(previousCommitmentHash);
        this._validateVersion(version);
        this._validateTimestamp(timestamp);

        // --- Reject duplicates ---
        const alreadyExists = await this._commitmentExists(ctx, id);
        if (alreadyExists) {
            throw new Error(`DUPLICATE_COMMITMENT: A commitment with id '${id}' already exists. Commitments are immutable.`);
        }

        // --- Build the record ---
        const blockTs = new Date(ctx.stub.getTxTimestamp().seconds.toNumber() * 1000).toISOString();
        const commitment: IntegrityCommitment = {
            id,
            eventType: eventType as EventType,
            entityType: entityType as EntityType,
            entityId,
            dataHash,
            previousCommitmentHash,
            version: parseInt(version, 10),
            timestamp,
            application: 'ZeroLeak',
            txId: ctx.stub.getTxID(),
            blockTimestamp: blockTs,
        };

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(commitment)));

        // --- Update ledger height counter ---
        const heightBytes = await ctx.stub.getState('LEDGER_HEIGHT');
        const currentHeight = (heightBytes && heightBytes.length > 0)
            ? parseInt(heightBytes.toString(), 10)
            : 0;
        const newHeight = currentHeight + 1;
        await ctx.stub.putState('LEDGER_HEIGHT', Buffer.from(newHeight.toString()));
        await ctx.stub.putState(`HEIGHT_INDEX_${newHeight}`, Buffer.from(id));

        console.info(`[ZeroLeak] CreateCommitment: committed id=${id} txId=${commitment.txId} height=${newHeight}`);

        return JSON.stringify({
            id,
            txId: commitment.txId,
            blockTimestamp: blockTs,
            height: newHeight,
            status: 'COMMITTED',
        });
    }

    // -----------------------------------------------------------------------
    // GetCommitment
    // Retrieves a commitment by ID (read-only — no ledger write).
    // -----------------------------------------------------------------------
    @Transaction(false)
    @Returns('string')
    public async GetCommitment(ctx: Context, id: string): Promise<string> {
        console.info(`[ZeroLeak] GetCommitment: id=${id}`);
        const bytes = await ctx.stub.getState(id);
        if (!bytes || bytes.length === 0) {
            throw new Error(`COMMITMENT_NOT_FOUND: No commitment found for id='${id}'.`);
        }
        return bytes.toString();
    }

    // -----------------------------------------------------------------------
    // VerifyCommitment
    // Compares the provided hash against the stored commitment hash.
    // Returns a structured verification result.
    // -----------------------------------------------------------------------
    @Transaction(false)
    @Returns('string')
    public async VerifyCommitment(ctx: Context, id: string, expectedHash: string): Promise<string> {
        console.info(`[ZeroLeak] VerifyCommitment: id=${id}`);

        if (!SHA256_PATTERN.test(expectedHash)) {
            throw new Error(`INVALID_HASH: expectedHash must be a 64-char lowercase hex SHA-256 digest.`);
        }

        const bytes = await ctx.stub.getState(id);
        if (!bytes || bytes.length === 0) {
            return JSON.stringify({
                valid: false,
                id,
                reason: 'COMMITMENT_NOT_FOUND',
            });
        }

        const commitment: IntegrityCommitment = JSON.parse(bytes.toString());
        const match = commitment.dataHash === expectedHash;

        return JSON.stringify({
            valid: match,
            id,
            entityId: commitment.entityId,
            entityType: commitment.entityType,
            storedHash: commitment.dataHash,
            providedHash: expectedHash,
            version: commitment.version,
            blockTimestamp: commitment.blockTimestamp,
            txId: commitment.txId,
            reason: match ? 'HASH_MATCH' : 'HASH_MISMATCH',
        });
    }

    // -----------------------------------------------------------------------
    // GetCommitmentHistory
    // Returns the Fabric key history for a commitment ID.
    // Because commitments are immutable (no updates), this typically has one entry.
    // -----------------------------------------------------------------------
    @Transaction(false)
    @Returns('string')
    public async GetCommitmentHistory(ctx: Context, id: string): Promise<string> {
        console.info(`[ZeroLeak] GetCommitmentHistory: id=${id}`);
        const iterator = await ctx.stub.getHistoryForKey(id);
        const history: object[] = [];

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const result = await iterator.next();
            if (result.done) break;
            const item = result.value;
            history.push({
                txId: item.txId,
                timestamp: item.timestamp
                    ? new Date(
                        item.timestamp.seconds.toNumber() * 1000
                    ).toISOString()
                    : null,
                isDelete: item.isDelete,
                value: item.value ? JSON.parse(Buffer.from(item.value).toString()) : null,
            });
        }
        await iterator.close();
        return JSON.stringify(history);
    }

    // -----------------------------------------------------------------------
    // Exists
    // -----------------------------------------------------------------------
    @Transaction(false)
    @Returns('boolean')
    public async Exists(ctx: Context, id: string): Promise<boolean> {
        return this._commitmentExists(ctx, id);
    }

    // -----------------------------------------------------------------------
    // GetLedgerHeight
    // -----------------------------------------------------------------------
    @Transaction(false)
    @Returns('string')
    public async GetLedgerHeight(ctx: Context): Promise<string> {
        const bytes = await ctx.stub.getState('LEDGER_HEIGHT');
        const height = (bytes && bytes.length > 0) ? parseInt(bytes.toString(), 10) : 0;
        return JSON.stringify({ height });
    }

    // -----------------------------------------------------------------------
    // GetRecentCommitments
    // Returns the most recent N commitments in descending order.
    // -----------------------------------------------------------------------
    @Transaction(false)
    @Returns('string')
    public async GetRecentCommitments(ctx: Context, limitStr: string): Promise<string> {
        const limit = Math.min(parseInt(limitStr, 10) || 20, 100);
        const heightBytes = await ctx.stub.getState('LEDGER_HEIGHT');
        const currentHeight = (heightBytes && heightBytes.length > 0)
            ? parseInt(heightBytes.toString(), 10)
            : 0;

        const results: IntegrityCommitment[] = [];
        for (let i = currentHeight; i > 0 && results.length < limit; i--) {
            const idBytes = await ctx.stub.getState(`HEIGHT_INDEX_${i}`);
            if (idBytes && idBytes.length > 0) {
                const id = idBytes.toString();
                const recBytes = await ctx.stub.getState(id);
                if (recBytes && recBytes.length > 0) {
                    results.push(JSON.parse(recBytes.toString()));
                }
            }
        }

        return JSON.stringify(results);
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    private async _commitmentExists(ctx: Context, id: string): Promise<boolean> {
        const bytes = await ctx.stub.getState(id);
        return !!(bytes && bytes.length > 0);
    }

    private _validateCommitmentId(id: string): void {
        if (!id || typeof id !== 'string') {
            throw new Error('VALIDATION_ERROR: commitment id must be a non-empty string.');
        }
        // Allow GENESIS sentinel
        if (id === 'GENESIS') return;
        if (!COMMITMENT_ID_PATTERN.test(id)) {
            throw new Error(
                `VALIDATION_ERROR: commitment id '${id}' does not match required pattern ` +
                `<entityType>_<24hexId>_v<positive-integer>. Example: result_507f1f77bcf86cd799439011_v1`
            );
        }
    }

    private _validateEventType(eventType: EventType): void {
        if (!VALID_EVENT_TYPES.includes(eventType)) {
            throw new Error(
                `VALIDATION_ERROR: eventType '${eventType}' is not valid. ` +
                `Allowed: ${VALID_EVENT_TYPES.join(', ')}`
            );
        }
    }

    private _validateEntityType(entityType: EntityType): void {
        if (!VALID_ENTITY_TYPES.includes(entityType)) {
            throw new Error(
                `VALIDATION_ERROR: entityType '${entityType}' is not valid. ` +
                `Allowed: ${VALID_ENTITY_TYPES.join(', ')}`
            );
        }
    }

    private _validateEntityId(entityId: string): void {
        // Allow genesis sentinel
        if (entityId === '000000000000000000000000') return;
        if (!OBJECT_ID_PATTERN.test(entityId)) {
            throw new Error(`VALIDATION_ERROR: entityId '${entityId}' must be a 24-char lowercase hex MongoDB ObjectId.`);
        }
    }

    private _validateDataHash(hash: string): void {
        if (!SHA256_PATTERN.test(hash)) {
            throw new Error(`VALIDATION_ERROR: dataHash '${hash}' must be a 64-char lowercase hex SHA-256 digest.`);
        }
    }

    private _validatePreviousHash(hash: string): void {
        // Empty string is allowed (first version)
        if (hash === '') return;
        if (!SHA256_PATTERN.test(hash)) {
            throw new Error(`VALIDATION_ERROR: previousCommitmentHash '${hash}' must be '' or a 64-char lowercase hex SHA-256 digest.`);
        }
    }

    private _validateVersion(version: string): void {
        const v = parseInt(version, 10);
        if (isNaN(v) || v < 0) {
            throw new Error(`VALIDATION_ERROR: version '${version}' must be a non-negative integer.`);
        }
    }

    private _validateTimestamp(timestamp: string): void {
        if (!timestamp || typeof timestamp !== 'string') {
            throw new Error('VALIDATION_ERROR: timestamp must be a non-empty string.');
        }
        const d = new Date(timestamp);
        if (isNaN(d.getTime())) {
            throw new Error(`VALIDATION_ERROR: timestamp '${timestamp}' is not a valid ISO-8601 date string.`);
        }
    }
}
