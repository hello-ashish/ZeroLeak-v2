# ZeroLeak Hyperledger Fabric Integration

This document outlines the Hyperledger Fabric integration for the ZeroLeak platform. Fabric serves as an **immutable integrity ledger**, ensuring that critical application data (such as exam results and questions) cannot be silently modified in the primary MongoDB database.

## Architecture

The integration follows a strict data-separation and outbox pattern:

1. **MongoDB (System of Record)**: Stores all application data, including student records, encrypted questions, and ZMail data.
2. **Fabric (Integrity Ledger)**: Stores ONLY SHA-256 hashes of critical data. **No sensitive data, PII, or answers are ever stored on the blockchain.**
3. **IntegrityOutbox (MongoDB)**: Acts as a reliable queue between the application and Fabric. If Fabric is temporarily down, the application continues to function perfectly; commitments are buffered in the outbox and retried automatically.

### Commitment Flow
- **Creation**: When a `Result`, `Question`, or `Exam` is created/finalized in MongoDB, an `IntegrityOutbox` record is atomically created in the same database.
- **Processing**: The background `IntegrityOutboxWorker` picks up pending records and submits them to the Fabric chaincode via the Fabric Gateway.
- **Storage**: The chaincode (`zeroleak-integrity`) verifies the input and stores the hash against a deterministic key (e.g., `result_507f1f77bcf86cd799439011_v1`). Commitments are immutable and duplicates are rejected.
- **Verification**: Admins and Auditors can use the Integrity Center UI to recompute the hash from MongoDB and compare it against the immutable hash on the Fabric ledger.

## Development Setup

The current integration targets the official Hyperledger Fabric `test-network` for local development.

### Prerequisites

1. Install Docker and Docker Compose.
2. Install the Hyperledger Fabric binaries and `fabric-samples`:
   ```bash
   curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.5
   ```
   *Note: This will download `fabric-samples` to your current directory. It is recommended to run this in your home directory (`~/fabric-samples`).*

### Quick Start (NPM Scripts)

ZeroLeak provides root-level npm scripts to manage the Fabric network:

1. **Start the Network**:
   ```bash
   npm run fabric:up
   ```
   *Starts the test network and creates the `zeroleak-channel`.*

2. **Deploy the Chaincode**:
   ```bash
   npm run fabric:deploy
   ```
   *Builds the TypeScript chaincode and deploys it to the channel.*

3. **Check Network Status**:
   ```bash
   npm run fabric:status
   ```

4. **Stop the Network**:
   ```bash
   npm run fabric:down
   ```
   *Shuts down the network and removes volumes.*

### Configuring ZeroLeak

After deploying the chaincode, enable Fabric in the backend by updating your `.env` file:

```env
FABRIC_ENABLED=true
FABRIC_CHANNEL_NAME=zeroleak-channel
FABRIC_CHAINCODE_NAME=zeroleak
FABRIC_MSP_ID=Org1MSP

# Adjust this path if your fabric-samples directory is not in your home folder:
FABRIC_CRYPTO_PATH=/Users/yourusername/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com
FABRIC_TLS_CERT_PATH=/Users/yourusername/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
```

Restart the ZeroLeak backend. The `IntegrityOutbox` worker will automatically start and flush any pending commitments to the ledger.

## Integrity Center UI

The ZeroLeak frontend includes a dedicated **Fabric Integrity Center** for Admins and Auditors. It provides:
- Live Fabric network connection status.
- Real-time ledger height and a list of recent immutable commitments.
- An Integrity Verification tool to check if a MongoDB document matches its Fabric commitment (detecting any unauthorized tampering).
- A clearly separated "Mock Lab" for educational demonstrations, distinct from the real production ledger.

## Disabling Fabric

To completely disable Fabric integration (e.g., if you don't want to run Docker locally), simply set:
```env
FABRIC_ENABLED=false
```
ZeroLeak will continue to function normally. Integrity commitments will be queued in the outbox but never processed.
