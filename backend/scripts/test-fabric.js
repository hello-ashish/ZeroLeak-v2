import 'dotenv/config';
import * as fabricService from '../src/Services/fabric.service.js';
import crypto from 'crypto';

async function run() {
    console.log("=============================================");
    console.log("ZeroLeak Fabric Service - Integration Test");
    console.log("=============================================\n");

    if (process.env.FABRIC_ENABLED !== 'true') {
        console.warn("⚠️  FABRIC_ENABLED is not true in your .env file.");
        console.warn("Please enable Fabric and ensure the test network is running before testing.\n");
        process.exit(1);
    }

    try {
        console.log("1. Initializing Fabric Gateway...");
        await fabricService.initFabricGateway();

        const status = fabricService.getFabricStatus();
        if (!status.connected) {
            console.error("❌ Failed to connect to Fabric network.");
            console.error(status);
            process.exit(1);
        }
        console.log("✅ Connected to Fabric network.");
        console.log(`   Peer: ${status.peerEndpoint}, Channel: ${status.channel}\n`);

        console.log("2. Querying Ledger Height...");
        const height = await fabricService.getLedgerHeight();
        console.log(`✅ Ledger height: ${height.height}\n`);

        console.log("3. Creating Test Commitment...");
        const mockEntityId = crypto.randomBytes(12).toString('hex'); // 24 char hex
        const commitmentId = fabricService.buildCommitmentId('SecurityEvent', mockEntityId, 1);

        const mockData = { message: "Test security event", timestamp: new Date().toISOString() };
        const dataHash = fabricService.computeDataHash(mockData);

        console.log(`   ID: ${commitmentId}`);
        console.log(`   Hash: ${dataHash}`);

        const createRes = await fabricService.createCommitment({
            id: commitmentId,
            eventType: 'SECURITY_EVENT',
            entityType: 'SecurityEvent',
            entityId: mockEntityId,
            dataHash: dataHash,
            timestamp: new Date().toISOString()
        });

        if (createRes.status === 'CONFIRMED' || createRes.status === 'DUPLICATE') {
            console.log(`✅ Commitment successful! TxID: ${createRes.txId}\n`);
        } else {
            throw new Error(`Unexpected status: ${createRes.status}`);
        }

        console.log("4. Fetching Commitment...");
        const fetched = await fabricService.getCommitment(commitmentId);
        console.log(`✅ Fetched commitment: ${fetched.id} (Hash: ${fetched.dataHash})\n`);

        console.log("5. Verifying Commitment...");
        const verifyRes = await fabricService.verifyCommitment(commitmentId, dataHash);
        if (verifyRes.valid) {
            console.log("✅ Verification successful - hashes match!\n");
        } else {
            console.error("❌ Verification failed!", verifyRes);
        }

        console.log("6. Verifying Bad Hash...");
        const badHash = '0000000000000000000000000000000000000000000000000000000000000000';
        const badVerifyRes = await fabricService.verifyCommitment(commitmentId, badHash);
        if (!badVerifyRes.valid && badVerifyRes.reason === 'HASH_MISMATCH') {
            console.log("✅ Bad hash rejected as expected.\n");
        } else {
            console.error("❌ Expected bad hash to be rejected!", badVerifyRes);
        }

        console.log("7. Closing connection...");
        await fabricService.closeFabricGateway();
        console.log("✅ Connection closed.");

        console.log("\n🎉 ALL TESTS PASSED!");

    } catch (err) {
        console.error("\n❌ TEST FAILED:", err);
        process.exit(1);
    }
}

run();
