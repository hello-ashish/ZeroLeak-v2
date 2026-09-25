import { createClient } from "redis";

// Create the main Redis client
const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

redisClient.on("error", (error) => {
    console.error("[REDIS] Error:", error);
});

redisClient.on("connect", () => {
    console.log("[REDIS] Connected successfully!");
});

export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error("[REDIS] Connection failed:", error);
    }
};

export default redisClient;
