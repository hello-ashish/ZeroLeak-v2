# ZeroLeak — Zero Trust Secure Examination Platform

A security-first online examination system with blockchain-backed integrity, encrypted question storage, and comprehensive anti-cheating telemetry.

## Architecture

```
frontend/          → React + Vite (student, professor, admin, auditor UIs)
backend/           → Express.js API server
  src/
    controllers/   → Route handlers (admin, professor, student, auditor, cheating, blockchain)
    models/        → Mongoose schemas (Student, Professor, Admin, Exam, Result, etc.)
    middlewares/   → Auth (JWT + cookie), rate limiting, error handling
    Services/      → Crypto (AES-256-GCM), Merkle tree, blockchain commitment
    blockchain/    → Fabric integration, outbox worker, anchor worker, verification
    routes/        → Express routers
  chaincode/       → Hyperledger Fabric chaincode
  contracts/       → Solidity contracts (Polygon anchor)
```

## Prerequisites

- Node.js ≥ 20
- MongoDB (local or Atlas)
- (Optional) Hyperledger Fabric network for blockchain mode
- (Optional) Polygon testnet wallet for public anchoring

## Quick Start (Development)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and secrets (see .env.example for all vars)
npm install
npm run dev
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Edit VITE_API_BASE_URL if needed
npm install
npm run dev
```

### 3. Seed Data (Development Only)

```bash
cd backend
node seed_test_data.js    # Creates test professor + student
node seed_auditor.js      # Creates demo auditor
```

> **Warning**: Seed scripts refuse to run when `NODE_ENV=production`.

## Environment Variables

See [`backend/.env.example`](backend/.env.example) for the complete reference. Key variables:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | ✅ | JWT signing secret (≥32 chars recommended) |
| `QUESTION_ENCRYPTION_KEY` | ✅ | Base64-encoded 32-byte AES-256 key |
| `CORS_ORIGIN` | ✅ | Allowed frontend origin (not `*` in production) |
| `ADMIN_BOOTSTRAP_SECRET` | ✅ | Secret for first admin account creation |
| `AUDITOR_BOOTSTRAP_SECRET` | ✅ | Secret for first auditor account creation |
| `BLOCKCHAIN_MODE` | — | `mock` (default for dev) or `production` |
| `NODE_ENV` | — | Set to `production` for secure cookies + error sanitization |

## Testing

```bash
cd backend
npm test
```

The test suite covers 106 tests across 20 suites including:
- Authentication/authorization boundaries
- Encryption integrity (AES-256-GCM roundtrip + tamper detection)
- Merkle root tampering (addition, deletion, substitution, reorder attacks)
- Blockchain commitment lifecycle and outbox concurrency
- Rate limiting, session security, and audit immutability

## Production Deployment

1. Set `NODE_ENV=production`
2. Set all required environment variables (see table above)
3. Set `CORS_ORIGIN` to your frontend domain (e.g., `https://zeroleak.example.com`)
4. Set `BLOCKCHAIN_MODE=production` and configure Fabric credentials
5. Use strong, unique secrets for `ACCESS_TOKEN_SECRET`, bootstrap secrets
6. Generate `QUESTION_ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

## Security Features

- **AES-256-GCM** encrypted question storage with integrity verification
- **Merkle root** commitment for exam question set integrity
- **Hyperledger Fabric** private blockchain for immutable audit trail
- **Polygon** public chain anchoring for external verifiability
- **HttpOnly + SameSite cookies** for session management
- **Rate limiting** on authentication and public endpoints
- **Helmet** security headers
- **Blocked-account enforcement** checked on every authenticated request
- **IDOR protection** via ownership verification on all professor resources
- **Atomic outbox processing** with lease-based concurrency control

## License

Proprietary — Team ZeroLeak