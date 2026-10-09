// Centralized Hyperledger Fabric Gateway service.
//
// Architecture:
//   ZeroLeak Backend
//     └─ fabric.service.js  (this file)
//           └─ Fabric Gateway (gRPC + TLS)
//                 └─ peer0.org1.example.com:7051
//                       └─ zeroleak-channel
//                             └─ ZeroLeakIntegrityContract


import * as grpc from '@grpc/grpc-js';
import { connect, hash, signers } from '@hyperledger/fabric-gateway';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Internal state
let _gateway = null;
let _grpcClient = null;
let _network = null;
let _contract = null;
let _connected = false;
let _connectError = null;
let _connectAttemptedAt = null;

const RECONNECT_COOLDOWN_MS = 30_000; // 30 s between reconnect attempts

// Configuration (from environment variables)
function _getFabricConfig() {
    return {
        enabled: process.env.FABRIC_ENABLED === 'true',
        channelName: process.env.FABRIC_CHANNEL_NAME || 'zeroleak-channel',
        chaincodeName: process.env.FABRIC_CHAINCODE_NAME || 'zeroleak',
        mspId: process.env.FABRIC_MSP_ID || 'Org1MSP',
        cryptoPath: process.env.FABRIC_CRYPTO_PATH || '',
        keyDirectoryPath: process.env.FABRIC_KEY_DIRECTORY_PATH || '',
        certDirectoryPath: process.env.FABRIC_CERT_DIRECTORY_PATH || '',
        tlsCertPath: process.env.FABRIC_TLS_CERT_PATH || '',
        peerEndpoint: process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051',
        peerHostAlias: process.env.FABRIC_PEER_HOST_ALIAS || 'peer0.org1.example.com',
        connectTimeoutMs: parseInt(process.env.FABRIC_CONNECT_TIMEOUT_MS || '30000', 10),
        endorseTimeoutMs: parseInt(process.env.FABRIC_ENDORSE_TIMEOUT_MS || '30000', 10),
        submitTimeoutMs: parseInt(process.env.FABRIC_SUBMIT_TIMEOUT_MS || '60000', 10),
        commitStatusTimeoutMs: parseInt(process.env.FABRIC_COMMIT_STATUS_TIMEOUT_MS || '60000', 10),
    };
}

// Initialize / Connect
async function _connect() {
    const cfg = _getFabricConfig();

    if (!cfg.enabled) {
        console.info('[FABRIC] FABRIC_ENABLED=false — Fabric integration is disabled.');
        return;
    }

    // Throttle reconnect attempts
    if (_connectAttemptedAt && (Date.now() - _connectAttemptedAt) < RECONNECT_COOLDOWN_MS) {
        return;
    }
    _connectAttemptedAt = Date.now();

    try {
        // --- Resolve certificate ---
        let certPath = _resolveCertPath(cfg);
        let keyPath = _resolveKeyPath(cfg);
        let tlsCertPath = cfg.tlsCertPath;

        if (!certPath) {
            const err = '[FABRIC] IDENTITY_ERROR: No certificate found. Check FABRIC_CERT_DIRECTORY_PATH or FABRIC_CRYPTO_PATH.';
            _handleConnectError(err, 'IDENTITY_ERROR');
            return;
        }
        if (!keyPath) {
            const err = '[FABRIC] IDENTITY_ERROR: No private key found. Check FABRIC_KEY_DIRECTORY_PATH or FABRIC_CRYPTO_PATH.';
            _handleConnectError(err, 'IDENTITY_ERROR');
            return;
        }
        if (!tlsCertPath || !fs.existsSync(tlsCertPath)) {
            const err = `[FABRIC] IDENTITY_ERROR: TLS CA certificate not found at: ${tlsCertPath}. Check FABRIC_TLS_CERT_PATH.`;
            _handleConnectError(err, 'IDENTITY_ERROR');
            return;
        }

        const certPem = fs.readFileSync(certPath).toString();
        const privateKeyPem = fs.readFileSync(keyPath).toString();
        const tlsCertPem = fs.readFileSync(tlsCertPath);

        // --- Build gRPC client with TLS ---
        const tlsCreds = grpc.credentials.createSsl(tlsCertPem);
        _grpcClient = new grpc.Client(cfg.peerEndpoint, tlsCreds, {
            'grpc.ssl_target_name_override': cfg.peerHostAlias,
        });

        // --- Build Fabric Gateway ---
        _gateway = connect({
            client: _grpcClient,
            identity: {
                mspId: cfg.mspId,
                credentials: Buffer.from(certPem),
            },
            signer: signers.newPrivateKeySigner(crypto.createPrivateKey(privateKeyPem)),
            hash: hash.sha256,
            evaluateOptions: () => ({ deadline: Date.now() + cfg.endorseTimeoutMs }),
            endorseOptions: () => ({ deadline: Date.now() + cfg.endorseTimeoutMs }),
            submitOptions: () => ({ deadline: Date.now() + cfg.submitTimeoutMs }),
            commitStatusOptions: () => ({ deadline: Date.now() + cfg.commitStatusTimeoutMs }),
        });

        _network = _gateway.getNetwork(cfg.channelName);
        _contract = _network.getContract(cfg.chaincodeName);
        _connected = true;
        _connectError = null;

        console.info(`[FABRIC] FABRIC_CONNECT_SUCCESS — Connected to ${cfg.peerEndpoint} | channel=${cfg.channelName} | chaincode=${cfg.chaincodeName} | msp=${cfg.mspId}`);

    } catch (err) {
        _handleConnectError(`[FABRIC] FABRIC_CONNECT_FAILURE — ${err.message}`, 'CONNECTION_ERROR', err);
    }
}

function _handleConnectError(message, category, originalError = null) {
    _connected = false;
    _gateway = null;
    _grpcClient = null;
    _network = null;
    _contract = null;
    _connectError = { message, category, at: new Date().toISOString() };
    console.error(message, originalError || '');
}

async function _ensureConnected() {
    if (_connected && _contract) return;
    await _connect();
    if (!_connected || !_contract) {
        const reason = _connectError?.message || 'FABRIC_UNAVAILABLE';
        const err = new Error(`FABRIC_UNAVAILABLE: ${reason}`);
        err.code = 'FABRIC_UNAVAILABLE';
        throw err;
    }
}

// Canonicalize + Hash (application-side, mirrors chaincode expectations)
export function canonicalize(value) {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value instanceof Date) return value.toISOString();
    if (value !== null && typeof value === 'object' && typeof value.toHexString === 'function') {
        return value.toHexString();
    }
    if (typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((out, key) => {
                out[key] = canonicalize(value[key]);
                return out;
            }, {});
    }
    return value;
}

export function computeDataHash(entity) {
    const canonical = canonicalize(entity);
    const plaintext = JSON.stringify(canonical);
    return crypto.createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

// Commitment ID helpers
export function buildCommitmentId(entityType, entityId, version) {
    const typeKey = entityType.toLowerCase().replace(/[^a-z]/g, '');
    return `${typeKey}_${entityId}_v${version}`;
}

// Public API
export async function createCommitment({
    id,
    eventType,
    entityType,
    entityId,
    dataHash,
    previousCommitmentHash = '',
    version = 1,
    timestamp,
}) {
    const cfg = _getFabricConfig();

    if (!cfg.enabled) {
        return { status: 'FABRIC_DISABLED', id };
    }

    await _ensureConnected();

    // Prefer a timestamp persisted in the outbox so every retry
    // uses the same value.
    const ts = timestamp || new Date().toISOString();

    try {
        console.info(
            `[FABRIC] FABRIC_COMMITMENT_SUBMITTED id=${id} eventType=${eventType} entityId=${entityId}`
        );

        const startMs = Date.now();

        const resultBytes = await _contract.submitTransaction(
            'CreateCommitment',
            id,
            eventType,
            entityType,
            entityId,
            dataHash,
            previousCommitmentHash,
            String(version),
            ts
        );

        const durationMs = Date.now() - startMs;

        const result = JSON.parse(
            Buffer.from(resultBytes).toString('utf8')
        );

        console.info(
            `[FABRIC] FABRIC_COMMITMENT_CONFIRMED id=${id} txId=${result.txId ?? 'unknown'} duration=${durationMs}ms`
        );

        return {
            ...result,
            id,
            status: 'CONFIRMED',
            duplicate: false,
        };
    } catch (err) {
        const msg = err?.message || String(err);

        if (!msg.includes('DUPLICATE_COMMITMENT')) {
            console.error(
                `[FABRIC] FABRIC_COMMITMENT_FAILED id=${id} error=${msg}`
            );

            _categorizeAndRethrow(err, { id, eventType });
        }

        console.warn(
            `[FABRIC] Duplicate commitment detected id=${id}; verifying existing record`
        );

        let existing;

        // Step 1: Retrieve the existing ledger record.
        // Failure here must never be treated as successful verification.
        try {
            const existingBytes =
                await _contract.evaluateTransaction(
                    'GetCommitment',
                    id
                );

            existing = JSON.parse(
                Buffer.from(existingBytes).toString('utf8')
            );
        } catch (fetchErr) {
            console.error(
                `[FABRIC] DUPLICATE_VERIFICATION_FAILED id=${id}: ${fetchErr.message}`
            );

            throw Object.assign(
                new Error(
                    `Unable to verify existing Fabric commitment '${id}'`
                ),
                {
                    code: 'DUPLICATE_VERIFICATION_FAILED',
                    cause: fetchErr,
                }
            );
        }

        // Step 2: Compare immutable fields.
        // Property names must match the actual chaincode record schema.
        const fieldsMatch =
            existing.id === id &&
            existing.eventType === eventType &&
            existing.entityType === entityType &&
            existing.entityId === entityId &&
            existing.dataHash === dataHash &&
            (existing.previousCommitmentHash ?? '') ===
                previousCommitmentHash &&
            String(existing.version) === String(version) &&
            (!timestamp || existing.timestamp === ts);

        // Step 3: Reject conflicting commitments.
        if (!fieldsMatch) {
            console.error(
                `[FABRIC] COMMITMENT_CONFLICT id=${id}: existing immutable fields differ`
            );

            throw Object.assign(
                new Error(
                    `Existing commitment '${id}' conflicts with the requested commitment`
                ),
                {
                    code: 'COMMITMENT_CONFLICT',
                }
            );
        }

        // Step 4: The existing commitment has been verified.
        // Report the same success status used for a new commitment,
        // while recording that this was an idempotent retry.
        console.info(
            `[FABRIC] Existing commitment verified id=${id}; treating retry as confirmed`
        );

        return {
            status: 'CONFIRMED',
            duplicate: true,
            id,
            txId: existing.txId ?? null,
            blockTimestamp: existing.blockTimestamp ?? null,
        };
    }
}

export async function getCommitment(id) {
    const cfg = _getFabricConfig();
    if (!cfg.enabled) {
        throw Object.assign(new Error('FABRIC_DISABLED'), { code: 'FABRIC_DISABLED' });
    }

    await _ensureConnected();

    try {
        const resultBytes = await _contract.evaluateTransaction('GetCommitment', id);
        return JSON.parse(Buffer.from(resultBytes).toString());
    } catch (err) {
        if (err.message?.includes('COMMITMENT_NOT_FOUND')) {
            const notFound = new Error(`COMMITMENT_NOT_FOUND: ${id}`);
            notFound.code = 'COMMITMENT_NOT_FOUND';
            throw notFound;
        }
        console.error(`[FABRIC] EVALUATE_ERROR GetCommitment id=${id} — ${err.message}`);
        _categorizeAndRethrow(err, { id });
    }
}

export async function verifyCommitment(id, expectedHash) {
    const cfg = _getFabricConfig();
    if (!cfg.enabled) {
        throw Object.assign(new Error('FABRIC_DISABLED'), { code: 'FABRIC_DISABLED' });
    }

    await _ensureConnected();

    try {
        const resultBytes = await _contract.evaluateTransaction('VerifyCommitment', id, expectedHash);
        const result = JSON.parse(Buffer.from(resultBytes).toString());
        if (result.valid) {
            console.info(`[FABRIC] FABRIC_VERIFICATION_SUCCESS id=${id}`);
        } else {
            console.warn(`[FABRIC] FABRIC_VERIFICATION_FAILED id=${id} reason=${result.reason}`);
        }
        return result;
    } catch (err) {
        console.error(`[FABRIC] EVALUATE_ERROR VerifyCommitment id=${id} — ${err.message}`);
        _categorizeAndRethrow(err, { id });
    }
}

export async function getCommitmentHistory(id) {
    const cfg = _getFabricConfig();
    if (!cfg.enabled) {
        throw Object.assign(new Error('FABRIC_DISABLED'), { code: 'FABRIC_DISABLED' });
    }

    await _ensureConnected();

    try {
        const resultBytes = await _contract.evaluateTransaction('GetCommitmentHistory', id);
        return JSON.parse(Buffer.from(resultBytes).toString());
    } catch (err) {
        console.error(`[FABRIC] EVALUATE_ERROR GetCommitmentHistory id=${id} — ${err.message}`);
        _categorizeAndRethrow(err, { id });
    }
}

export async function getLedgerHeight() {
    const cfg = _getFabricConfig();
    if (!cfg.enabled) {
        return { height: 0, status: 'FABRIC_DISABLED' };
    }

    await _ensureConnected();

    const resultBytes = await _contract.evaluateTransaction('GetLedgerHeight');
    return JSON.parse(Buffer.from(resultBytes).toString());
}

export async function getRecentCommitments(limit = 20) {
    const cfg = _getFabricConfig();
    if (!cfg.enabled) {
        return [];
    }

    await _ensureConnected();

    const resultBytes = await _contract.evaluateTransaction('GetRecentCommitments', String(limit));
    return JSON.parse(Buffer.from(resultBytes).toString());
}

export async function commitmentExists(id) {
    const cfg = _getFabricConfig();
    if (!cfg.enabled) {
        return false;
    }

    await _ensureConnected();

    const resultBytes = await _contract.evaluateTransaction('Exists', id);
    return JSON.parse(Buffer.from(resultBytes).toString()) === true;
}

export function getFabricStatus() {
    const cfg = _getFabricConfig();
    if (!cfg.enabled) {
        return {
            enabled: false,
            connected: false,
            channel: cfg.channelName,
            chaincode: cfg.chaincodeName,
            mspId: cfg.mspId,
            reason: 'FABRIC_DISABLED',
        };
    }

    return {
        enabled: true,
        connected: _connected,
        channel: cfg.channelName,
        chaincode: cfg.chaincodeName,
        mspId: cfg.mspId,
        peerEndpoint: cfg.peerEndpoint,
        reason: _connected ? null : (_connectError?.category || 'UNKNOWN'),
        error: _connected ? null : (_connectError?.message || null),
        lastAttemptedAt: _connectAttemptedAt ? new Date(_connectAttemptedAt).toISOString() : null,
    };
}

export async function closeFabricGateway() {
    if (_gateway) {
        try {
            _gateway.close();
            console.info('[FABRIC] Fabric Gateway closed.');
        } catch (_) { /* ignore */ }
    }
    if (_grpcClient) {
        _grpcClient.close();
    }
    _gateway = null;
    _grpcClient = null;
    _network = null;
    _contract = null;
    _connected = false;
}

export async function initFabricGateway() {
    const cfg = _getFabricConfig();
    if (!cfg.enabled) {
        console.info('[FABRIC] Fabric integration is DISABLED (FABRIC_ENABLED=false). ZeroLeak runs without Fabric.');
        return;
    }
    console.info('[FABRIC] Initializing Fabric Gateway...');
    await _connect();
}

// Path resolution helpers
function _resolveCertPath(cfg) {
    // Option 1: explicit FABRIC_CERT_DIRECTORY_PATH
    if (cfg.certDirectoryPath && fs.existsSync(cfg.certDirectoryPath)) {
        const files = fs.readdirSync(cfg.certDirectoryPath).filter(f => f.endsWith('.pem'));
        if (files.length > 0) return path.join(cfg.certDirectoryPath, files[0]);
    }
    // Option 2: derive from FABRIC_CRYPTO_PATH (test-network layout)
    if (cfg.cryptoPath) {
        const derived = path.join(cfg.cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts');
        if (fs.existsSync(derived)) {
            const files = fs.readdirSync(derived).filter(f => f.endsWith('.pem'));
            if (files.length > 0) return path.join(derived, files[0]);
        }
    }
    return null;
}

function _resolveKeyPath(cfg) {
    if (cfg.keyDirectoryPath && fs.existsSync(cfg.keyDirectoryPath)) {
        const files = fs.readdirSync(cfg.keyDirectoryPath).filter(f => f.endsWith('_sk') || !f.includes('.'));
        if (files.length > 0) return path.join(cfg.keyDirectoryPath, files[0]);
    }
    if (cfg.cryptoPath) {
        const derived = path.join(cfg.cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore');
        if (fs.existsSync(derived)) {
            const files = fs.readdirSync(derived);
            if (files.length > 0) return path.join(derived, files[0]);
        }
    }
    return null;
}

// Error categorization
function _categorizeAndRethrow(err, context = {}) {
    const msg = err.message || '';
    let code = 'FABRIC_ERROR';

    if (msg.includes('DUPLICATE_COMMITMENT')) code = 'DUPLICATE_COMMITMENT';
    else if (msg.includes('COMMITMENT_NOT_FOUND')) code = 'COMMITMENT_NOT_FOUND';
    else if (msg.includes('VALIDATION_ERROR')) code = 'CHAINCODE_VALIDATION_ERROR';
    else if (msg.includes('Endorsement')) code = 'ENDORSEMENT_ERROR';
    else if (msg.includes('deadline') || msg.includes('timeout')) code = 'COMMIT_TIMEOUT';
    else if (msg.includes('INVALID')) code = 'COMMIT_INVALID';
    else if (msg.includes('UNAVAILABLE') || msg.includes('connect')) code = 'CONNECTION_ERROR';
    else if (msg.includes('certificate') || msg.includes('TLS')) code = 'TLS_ERROR';

    // Mark connection as broken if it's a connectivity issue
    if (['CONNECTION_ERROR', 'TLS_ERROR'].includes(code)) {
        _connected = false;
        _connectError = { message: msg, category: code, at: new Date().toISOString() };
    }

    const richErr = new Error(msg);
    richErr.code = code;
    richErr.context = context;
    throw richErr;
}
