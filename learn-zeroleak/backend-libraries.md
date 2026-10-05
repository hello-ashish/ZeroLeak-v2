# Backend Libraries Analysis - ZeroLeak

This document provides an in-depth analysis of every library (dependency and devDependency) used in the ZeroLeak backend. Each entry explains **what** the library is, **why** it is used, **where** it is applied in the codebase, and **how** it functions within the context of the platform.

---

## 1. Core Web Framework & Middleware

### `express`
* **What**: A fast, unopinionated, minimalist web framework for Node.js.
* **Why**: It provides robust routing, middleware support, and HTTP utility methods, making it the industry standard for building REST APIs in Node.js.
* **Where**: Used globally across the application. Initialized in `src/app.js` and used extensively in the `src/routes/` directory (e.g., `student.routes.js`, `admin.routes.js`).
* **How**: It creates the main server instance, handles incoming HTTP requests, maps them to specific controller functions via Routers (`Router()`), and manages responses back to the client.

### `cors`
* **What**: An Express middleware used to enable Cross-Origin Resource Sharing.
* **Why**: The ZeroLeak frontend (likely a React or Next.js app) runs on a different port or domain than the backend. Web browsers block such cross-origin requests by default for security. `cors` adds the necessary HTTP headers to allow the frontend to securely communicate with the backend.
* **Where**: Instantiated as a global middleware in `src/app.js`.
* **How**: Intercepts incoming requests and adds headers like `Access-Control-Allow-Origin`, permitting cross-origin API calls.

### `dotenv`
* **What**: A zero-dependency module that loads environment variables from a `.env` file into `process.env`.
* **Why**: To keep sensitive configurations (database URIs, secret keys, port numbers) out of the codebase. It helps maintain a secure, 12-factor app configuration setup.
* **Where**: Pre-loaded in the `package.json` scripts (`-r dotenv/config`) and also explicitly imported in `src/index.js` and migration scripts like `src/migrations/zmailBackfill.js`.
* **How**: It reads the `.env` file at the project root and sets the variables so they are accessible via `process.env.VARIABLE_NAME` globally.

---

## 2. Database & Data Modeling

### `mongoose`
* **What**: An elegant MongoDB object modeling tool designed to work in an asynchronous environment.
* **Why**: MongoDB is a NoSQL database that is schema-less. `mongoose` provides a rigorous modeling environment, adding schema validations, query building, middleware (hooks), and business logic to MongoDB data.
* **Where**: Used in `src/db/index.js` for database connection, and heavily utilized across all files in the `src/models/` directory (e.g., `admin.models.js`, `student.models.js`, `examination.models.js`).
* **How**: Defines strict schemas (using `new Schema()`), compiles them into models, and performs CRUD operations via controller functions. It ensures only valid data is written to the database.

---

## 3. Security & Authentication

### `bcrypt`
* **What**: A library to help hash passwords using the bcrypt hashing algorithm.
* **Why**: Storing plain-text passwords is a massive security risk. `bcrypt` automatically handles salting and multiple rounds of hashing to protect user credentials against rainbow table and brute-force attacks.
* **Where**: Used in all user models where passwords are saved (`src/models/admin.models.js`, `student.models.js`, etc.) and controllers (`src/controllers/auditor.controllers.js`).
* **How**: Typically used within a Mongoose `pre('save')` hook to hash the password before saving it to the database, and `bcrypt.compare()` is used during the login process to verify the password.

### `jsonwebtoken` (JWT)
* **What**: An implementation of JSON Web Tokens.
* **Why**: To securely transmit information between parties as a JSON object, primarily used for stateless authentication and authorization. It eliminates the need for storing session states on the server.
* **Where**: Used in user models to generate tokens (e.g., `src/models/admin.models.js`), in `src/middlewares/auth.middleware.js` to verify tokens, and within Socket.IO implementations (`src/sockets/zmail.socket.js`, `src/sockets/proctoring.socket.js`) to authenticate socket connections.
* **How**: `jwt.sign()` generates a token upon successful login embedding user IDs. Subsequent requests include this token in the `Authorization` header. Middleware uses `jwt.verify()` to validate the token before granting access to protected routes or socket namespaces.

---

## 4. Real-time Communication

### `socket.io`
* **What**: A library that enables bidirectional, low-latency, and event-based communication between a client and a server.
* **Why**: WebSockets are required for real-time features. Socket.IO provides a reliable layer over WebSockets with fallbacks to HTTP long-polling, automatic reconnection, and multiplexing (namespaces/rooms).
* **Where**: Initialized in `src/index.js` and specifically implemented in the `src/sockets/` directory for features like live proctoring (`proctoring.socket.js`), support chat (`support.socket.js`), and zmail communications (`zmail.socket.js`).
* **How**: It wraps the standard Node.js HTTP server. It listens for incoming socket connections and uses `socket.on` to receive events and `socket.emit` to send real-time data back to the client or broadcast to specific rooms.

### `redis` & `@socket.io/redis-adapter`
* **What**: `redis` is a Node.js client for Redis. The `@socket.io/redis-adapter` is an adapter that allows Socket.IO to broadcast events across multiple Node.js instances.
* **Why**: By default, Socket.IO stores connected clients in memory. If you scale the backend to multiple servers/instances, a user on Server A cannot receive a broadcast from Server B. Redis acts as a Pub/Sub message broker to synchronize Socket.IO events across all servers.
* **Where**: Initialized in `src/index.js` and `src/redis/index.js`.
* **How**: Two Redis clients (publisher and subscriber) are created and passed to `createAdapter()`. Socket.IO uses this adapter to ensure seamless real-time messaging even in a load-balanced environment.

---

## 5. Blockchain & Cryptography Integration

### `@grpc/grpc-js` & `@hyperledger/fabric-gateway`
* **What**: `@grpc/grpc-js` is the pure JavaScript gRPC implementation for Node.js. `@hyperledger/fabric-gateway` is the client API for Hyperledger Fabric blockchain.
* **Why**: Hyperledger Fabric operates over gRPC. These libraries allow the Node.js backend to securely connect to Fabric peers, submit transactions, and evaluate chaincode (smart contracts) on a private enterprise blockchain.
* **Where**: Implemented in `src/blockchain/private/fabricGateway.service.js`.
* **How**: `@grpc/grpc-js` establishes a secure communication channel with the Fabric peer using TLS certificates. `@hyperledger/fabric-gateway` uses this connection to create a gateway, get the network, access smart contracts, and submit transactions asynchronously.

### `ethers`
* **What**: A complete and compact library for interacting with the Ethereum Blockchain and its ecosystem.
* **Why**: Used for interacting with public blockchains (EVM compatible). It handles cryptographic operations, wallet management, and smart contract interactions.
* **Where**: Found in `src/blockchain/public/anchor.service.js`.
* **How**: It provides abstractions to connect to an Ethereum node (via RPC), load smart contract ABIs, sign transactions using private keys, and anchor/verify hashes on a public ledger for immutable proof of integrity.

---

## 6. Background Jobs & AI Inference

### `node-cron`
* **What**: A tiny task scheduler in pure JavaScript for Node.js based on GNU crontab.
* **Why**: Needed to execute scheduled tasks asynchronously, without manual intervention.
* **Where**: Used in `src/cron/examScheduler.js`.
* **How**: It uses cron syntax (e.g., `* * * * *`) to define when a task should run. It is likely used to automatically change examination statuses (e.g., from 'scheduled' to 'active' to 'completed') based on the current time.

### `groq-sdk`
* **What**: The official SDK for interacting with Groq's high-speed AI inference API.
* **Why**: Groq provides ultra-fast LLM inference using proprietary LPUs (Language Processing Units). The SDK is required to integrate intelligent, generative AI features into the platform seamlessly.
* **Where**: Used in `src/Services/ai/ai.service.js`.
* **How**: It initializes a client with an API key, allowing the backend to send prompts to Groq's hosted models (like LLaMA or Mixtral) and receive extremely fast natural language responses for automated proctoring analysis or support bots.

---

## 7. API Documentation

### `swagger-jsdoc` & `swagger-ui-express`
* **What**: `swagger-jsdoc` reads JSDoc-annotated source code and generates an OpenAPI (Swagger) specification. `swagger-ui-express` serves this generated spec as a beautiful, interactive web interface.
* **Why**: Essential for standardizing API documentation. It allows frontend developers, auditors, and external consumers to easily understand, explore, and test API endpoints directly from the browser.
* **Where**: Configured and initialized in `src/swagger.js`.
* **How**: `swagger-jsdoc` parses comment blocks above Express routes to build a JSON schema. `swagger-ui-express` mounts this schema to an Express route (e.g., `/api-docs`), rendering the interactive Swagger UI.

---

## 8. Development Tools (DevDependencies)

### `jest`
* **What**: A delightful JavaScript Testing Framework with a focus on simplicity.
* **Why**: Used for writing and executing unit and integration tests to ensure the backend logic functions as expected and to prevent regressions.
* **How**: Run via `npm run test` using experimental VM modules. It searches for `.test.js` files, executes test suites, and provides detailed assertion reports and code coverage.

### `nodemon`
* **What**: A utility that automatically restarts the Node.js application when file changes in the directory are detected.
* **Why**: Drastically improves developer experience by eliminating the need to manually stop and restart the server after every code edit.
* **How**: Executed via `npm run dev`. It wraps the standard `node` command and watches for changes in `.js` or `.json` files.

### `prettier`
* **What**: An opinionated code formatter.
* **Why**: Ensures consistent code style across the entire project, regardless of which developer wrote the code. It eliminates arguments over formatting (tabs vs spaces, single vs double quotes).
* **How**: Usually run as a pre-commit hook or triggered via IDE extensions to format the code automatically on save based on configured rules.
