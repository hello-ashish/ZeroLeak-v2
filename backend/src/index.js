import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"


dotenv.config({
    path: './.env'
})

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