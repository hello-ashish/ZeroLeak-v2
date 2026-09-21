// Real Hyperledger Fabric Gateway integration.
// To run this, you need a running Fabric network (e.g. fabric-samples/test-network)
import * as grpc from '@grpc/grpc-js';
import { connect, signers } from '@hyperledger/fabric-gateway';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment variables to configure Fabric connection
const channelName = process.env.FABRIC_CHANNEL || 'mychannel';
const chaincodeName = process.env.FABRIC_CHAINCODE || 'integrityContract';
const mspId = process.env.FABRIC_ORG || 'Org1MSP';
const cryptoPath = process.env.FABRIC_CREDENTIAL_PATH || path.resolve(__dirname, '..', '..', '..', '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com');
const peerEndpoint = process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051';
const peerHostAlias = process.env.FABRIC_PEER_HOST_ALIAS || 'peer0.org1.example.com';

let gateway;
let contract;

async function newGrpcConnection() {
    const tlsCertPath = path.resolve(cryptoPath, 'peers', peerHostAlias, 'tls', 'ca.crt');
    const tlsRootCert = fs.readFileSync(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity() {
    const certPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts', 'cert.pem');
    const credentials = fs.readFileSync(certPath);
    return { mspId, credentials };
}

async function newSigner() {
    const keyDirectoryPath = path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore');
    const files = fs.readdirSync(keyDirectoryPath);
    const keyPath = path.resolve(keyDirectoryPath, files[0]);
    const privateKeyPem = fs.readFileSync(keyPath); // PEM stands for Privacy-Enhanced Mail.
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

export async function getFabricContract() {
    if (contract) return contract;

    if (process.env.BLOCKCHAIN_MODE === 'mock') {
        return null;
    }

    try {
        // We only attempt to connect if the crypto path exists
        if (!fs.existsSync(cryptoPath)) {
            throw new Error(`[Fabric] Crypto path ${cryptoPath} not found. Cannot connect to real Fabric network. Failure in production mode.`);
        }

        const client = await newGrpcConnection();
        const identity = await newIdentity();
        const signer = await newSigner();

        gateway = connect({
            client,
            identity,
            signer,
            evaluateOptions: () => { // read only getAsset(), ReadRecord(), checkIntegrity()
                return { deadline: Date.now() + 5000 };
            },
            endorseOptions: () => { // endorsement by peers
                return { deadline: Date.now() + 15000 };
            },
            submitOptions: () => {
                return { deadline: Date.now() + 5000 };
            },
            commitStatusOptions: () => {
                return { deadline: Date.now() + 60000 };
            },
        });

        const network = gateway.getNetwork(channelName);
        contract = network.getContract(chaincodeName);
        console.log('[Fabric] Connected to Fabric gateway successfully.');
        return contract;
    } catch (error) {
        console.error('[Fabric] Failed to connect to Fabric gateway:', error);
        throw error;
    }
}
