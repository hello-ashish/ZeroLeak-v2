# ZeroLeak Data Models Architecture

This document provides an in-depth explanation of the Mongoose data models used in the **ZeroLeak** backend. The models are structured to support a highly secure, role-based, and zero-trust examination platform. 

The models can be categorized into four primary domains:
1. **User Management & Roles**
2. **Exam Lifecycle & Assessment**
3. **Security, Proctoring & Anti-Cheating**
4. **Blockchain Integrity (Zero-Trust Layer)**
5. **System Operations & Support**

---

## 1. User Management & Roles

ZeroLeak uses specific, isolated models for different user roles rather than a single `User` table. This ensures strict boundary separation for authentication and authorization.

### `student.models.js`
- **Purpose:** Manages the primary end-users taking the exams.
- **Key Fields:** Contains standard profile info (`studentId`, `email`, `department`, `batch`) alongside security state flags like `isBlocked`, `blockedReason`, and `sessionVersion` (used for invalidating old JWTs). It also tracks `currentExamId` to prevent simultaneous logins across multiple devices for the same exam.
- **Why it's used:** Ensures strict control over a student's active state and history, crucial for blocking cheaters and ensuring they cannot bypass restrictions.

### `professor.models.js`
- **Purpose:** Manages the creators of question banks and batches.
- **Key Fields:** Contains `email`, `password`, and `isBlocked` statuses. 
- **Why it's used:** Professors have a distinct workflow—they do not interact with live exams, but rather submit "Batches" of questions for Admin review.

### `admin.models.js` & `auditor.models.js` *(Inferred based on architecture)*
- **Purpose:** `Admin` manages the overarching examination configurations, approvals, and user statuses. `Auditor` is a read-only role designed for compliance officers to verify system integrity.
- **Why it's used:** Separating Admin (read/write/execute) from Auditor (read-only/verify) is a core tenet of the Zero-Trust methodology.

---

## 2. Exam Lifecycle & Assessment

These models represent the flow of questions from creation to a finalized exam result.

### `question.models.js` & `batch.models.js`
- **Purpose:** Professors create `Questions` which are grouped into a `Batch`. 
- **Key Fields (`Batch`):** Contains an array of draft questions, `subject`, and a `status` (`Draft`, `Submitted`, `Accepted`, `Rejected`). It also includes cryptographic fields (`merkleRoot`, `commitmentId`, `commitmentHash`).
- **Why it's used:** This creates a review workflow. Professors cannot directly inject questions into an exam. They submit a batch, the Admin reviews/approves it, and the system generates a Merkle Root hash of the batch to lock its state cryptographically before it is used.

### `examination.models.js` & `exam.models.js`
- **Purpose:** An `Examination` acts as an overarching category (e.g., "Midterms 2026"), while an `Exam` represents the actual test instance (e.g., "Physics 101 Midterm").
- **Key Fields (`Exam`):** Contains `durationMinutes`, `passingPercentage`, `status` (Draft, Scheduled, Live, Completed), and references to `Questions`. It heavily utilizes cryptographic fields (`questionMerkleRoot`, `commitmentHash`) to lock the exam state.
- **Why it's used:** Allows Admins to schedule tests securely. The cryptographic hashing guarantees that once an exam goes "Live", the exact questions assigned cannot be secretly altered in the database without breaking the hash.

### `result.models.js`
- **Purpose:** Tracks a student's attempt at a specific `Exam`.
- **Key Fields:** Tracks `score`, `status` (InProgress, Completed, Terminated), `latestAnswers` (for auto-saving in case of offline drops), and `terminationReason`. It also includes `resetByAdmin` to allow fresh attempts if a student was falsely flagged.
- **Why it's used:** This is a living document during a test. As a student answers, `latestAnswers` is updated. If the anti-cheating engine terminates them, `isTerminated` flips to true, freezing the attempt.

---

## 3. Security, Proctoring & Anti-Cheating

These models power the telemetry, monitoring, and automated penalty systems.

### `proctoringSession.models.js`
- **Purpose:** Represents a real-time connection state for a student taking an exam.
- **Key Fields:** Tracks `cameraStatus`, `microphoneStatus`, `screenStatus`, `fullscreenStatus`, `tabSwitchCount`, `windowBlurCount`, and `lastHeartbeat`.
- **Why it's used:** ZeroLeak relies on constant monitoring. This model stores the state reported by the Socket.io/WebRTC client. If `lastHeartbeat` stops updating, the system knows the student disconnected or is trying to bypass the UI.

### `cheatingIncident.models.js`
- **Purpose:** Logs specific violations detected by the UI or backend.
- **Key Fields:** Logs the `violationType`, `severity`, `actionTaken` (WARNING, AUTO_SUBMIT, EXAM_TERMINATED), and `reviewStatus`.
- **Why it's used:** Enforces the "3-Strike Rule". When a student switches tabs, an incident is created. If too many high-severity incidents accrue, the system automatically alters the `Result` model to "Terminated" and logs the action here for the Admin to review later.

### `proctoringAIEvent.models.js` & `proctoringIncident.models.js`
- **Purpose:** Designed for the upcoming AI integrations (face tracking, gaze detection).
- **Why it's used:** Will store structured data about micro-events (e.g., "Student looked off-screen for 5 seconds") to provide a timeline to the Admin dashboard.

---

## 4. Blockchain Integrity (Zero-Trust Layer)

This is the most unique aspect of the platform's database design.

### `integrityOutbox.models.js`
- **Purpose:** Implements the Transactional Outbox pattern for communicating with Hyperledger Fabric.
- **Key Fields:** Contains `objectType` (e.g., "Result", "Exam"), `commitmentType`, `canonicalHash` (the Merkle root), `payload`, and `status` (PENDING, SUBMITTED, CONFIRMED).
- **Why it's used:** Because writing to a blockchain can be slow or fail, the Node.js backend does not write to Fabric synchronously. Instead, when an Exam finishes, a record is saved here. A background `node-cron` worker (`AnchorWorker`) polls this table every 5 seconds and commits the `canonicalHash` to the immutable ledger. This ensures zero data loss and guarantees that Auditors can verify the MongoDB state against the blockchain.

---

## 5. System Operations & Support

### `auditlog.models.js` & `anomaly.models.js`
- **Purpose:** Tracks administrative actions (e.g., "Admin unblocked Student") and systemic anomalies.
- **Why it's used:** Required for the Auditor dashboard to ensure admins are not abusing their power.

### Support Models (`supportTicket`, `supportTicketHistory`, `supportInternalNote`)
- **Purpose:** Standard ticketing system models for users to report issues (e.g., "My exam crashed") to the admins.
