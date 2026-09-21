import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"


dotenv.config({
    path: './.env'
})

// ── Startup Environment Validation ──────────────────────────────────
function validateEnv() {
    const required = [
        'MONGODB_URI',
        'ACCESS_TOKEN_SECRET',
        'QUESTION_ENCRYPTION_KEY',
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
        console.error('Server cannot start without these. See .env.example for reference.');
        process.exit(1);
    }

    // Warn about insecure defaults
    if (process.env.ACCESS_TOKEN_SECRET && process.env.ACCESS_TOKEN_SECRET.length < 32) {
        console.warn('[Security Warning] ACCESS_TOKEN_SECRET is shorter than 32 characters. Use a strong secret in production.');
    }

    if (process.env.CORS_ORIGIN === '*') {
        console.warn('[Security Warning] CORS_ORIGIN is set to "*". Restrict this to your frontend domain in production.');
    }

    if (!process.env.ADMIN_BOOTSTRAP_SECRET) {
        console.warn('[Startup Warning] ADMIN_BOOTSTRAP_SECRET is not set. Admin bootstrap endpoint will reject all requests.');
    }

    if (!process.env.AUDITOR_BOOTSTRAP_SECRET) {
        console.warn('[Startup Warning] AUDITOR_BOOTSTRAP_SECRET is not set. Auditor bootstrap endpoint will reject all requests.');
    }
}

validateEnv();


// first connect the database
connectDB()
    .then(async () => {
        // Validate Blockchain configuration at startup
        const BLOCKCHAIN_MODE = process.env.BLOCKCHAIN_MODE || 'production';
        if (BLOCKCHAIN_MODE !== 'mock') {
            if (!process.env.FABRIC_CREDENTIAL_PATH) {
                console.warn("[Startup Warning] FABRIC_CREDENTIAL_PATH is not set. Fabric connections will likely fail unless defaults match the environment.");
            }
        } else {
            console.log("[Startup] Running in BLOCKCHAIN_MODE=mock. Fabric network will be bypassed.");
        }

        // Init background workers for blockchain
        const { startOutboxWorker } = await import("./blockchain/workers/outboxWorker.service.js");
        const { startAnchorWorker } = await import("./blockchain/workers/anchorWorker.service.js");
        startOutboxWorker();
        startAnchorWorker();
        console.log("ZeroLeak background workers initialized.");
        app.listen(process.env.PORT || 4000, () => {
            console.log(`Server is running on port : ${process.env.PORT || 4000}`)
        })
    })
    .catch((error) => {
        console.log("MongoDB connection error : ", error)
        process.exit(1)
    })