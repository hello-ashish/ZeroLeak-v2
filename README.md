# ZeroLeak
## A Zero Trust Secure Examination Platform

**ZeroLeak** is a secure, high-integrity examination and assessment platform designed to prevent cheating, detect anomalies, and ensure absolute transparency in the examination process. Built on the principles of zero trust, the system features cryptographic hashing (Merkle trees) and blockchain-backed auditing for exams, question batches, and results.

It is built to serve multiple stakeholders, each with tailored interfaces and permissions: **Students**, **Professors**, **Admins**, and **Auditors**.

### Key Features
- **Blockchain Auditing:** Ensures data integrity using Hyperledger Fabric and cryptographic commitments.
- **Anti-Cheating Mechanisms:** Robust incident detection and review processes to track potential violations.
- **Role-Based Access Control:** Distinct workflows and portals for different user roles.
- **Data Integrity via Merkle Trees:** Cryptographic hashing of question content, batches, and test results to guarantee untampered records.
- **Detailed Analytics:** Rich dashboards using Recharts for real-time exam metrics, student performance, and anomaly detection.

### Tech Stack
- **Frontend:** React.js 19, Vite, React Router, Recharts (for charts), Lucide-React (for icons)
- **Backend:** Node.js, Express.js (v5), Mongoose, JsonWebToken, Node-Cron (for background tasks)
- **Database:** MongoDB (Operational Database)
- **Blockchain / Ledger:** Hyperledger Fabric (via `@hyperledger/fabric-gateway`) for immutable audit logs
- **Cryptography:** Bcrypt for passwords, custom crypto services for content encryption/hashing

### Getting Started

#### Prerequisites
- Node.js (v20+ recommended)
- MongoDB instance (Local or Atlas)
- Hyperledger Fabric test network (for blockchain ledger capabilities)

#### Backend Setup
1. Navigate to the `backend` directory: 
   ```bash
   cd backend
   ```
2. Install dependencies: 
   ```bash
   npm install
   ```
3. Configure your `.env` file with your MongoDB connection string, JWT secrets, and Fabric configuration.
4. Start the development server: 
   ```bash
   npm run dev
   ```

#### Frontend Setup
1. Navigate to the `frontend` directory: 
   ```bash
   cd frontend
   ```
2. Install dependencies: 
   ```bash
   npm install
   ```
3. Start the Vite development server: 
   ```bash
   npm run dev
   ```

### Documentation
- For detailed information on how MongoDB and Mongoose are implemented in this project, refer to the [MongoDB README](./MONGODB_README.md).
