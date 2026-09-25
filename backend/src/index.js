import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"
import http from "http"
import { Server } from "socket.io"
import { setupProctoringSockets } from "./sockets/proctoring.socket.js"
import { createAdapter } from "@socket.io/redis-adapter"
import redisClient, { connectRedis } from "./redis/index.js"

dotenv.config({
    path: './.env'
})

// first connect the database
connectDB()
    .then(async () => {
        // Connect Redis
        await connectRedis();

        // Init background workers for blockchain
        const { startOutboxWorker } = await import("./blockchain/workers/outboxWorker.service.js");
        const { startAnchorWorker } = await import("./blockchain/workers/anchorWorker.service.js");
        startOutboxWorker();
        startAnchorWorker();
        console.log("ZeroLeak background workers initialized.");

        // Create HTTP server and initialize Socket.IO
        const server = http.createServer(app);
        const io = new Server(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || "*",
                methods: ["GET", "POST"]
            }
        });

        // Setup Redis Adapter for Socket.IO (with fallback)
        try {
            const pubClient = redisClient.duplicate();
            const subClient = redisClient.duplicate();
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));
            console.log("[REDIS] Socket.IO Adapter successfully configured.");
        } catch (error) {
            console.warn("[REDIS] Could not connect to Redis server. Falling back to default in-memory adapter.");
        }

        // Setup Proctoring Sockets
        setupProctoringSockets(io);
        
        server.listen(process.env.PORT || 4000, () => {
            console.log(`Server is running on port : ${process.env.PORT || 4000}`)
        })
    })
    .catch((error) => {
        console.log("MongoDB connection error : ", error)
        process.exit(1)
    })