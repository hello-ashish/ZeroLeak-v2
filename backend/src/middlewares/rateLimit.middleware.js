import redisClient from "../redis/index.js"

/**
 * Creates a rate limit middleware.
 * @param {string} keyPrefix - Unique prefix for this endpoint (e.g., "ai:batch")
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowSeconds - Window size in seconds (default: 60)
 */
export function rateLimit(keyPrefix, maxRequests, windowSeconds = 60) {
    return async (req, res, next) => {
        try {
            const professorId = req.professor?._id?.toString()
            if (!professorId) {
                return res.status(401).json({ message: "Unauthorized" })
            }

            const key = `ratelimit:${keyPrefix}:${professorId}`

            // Check if redis is connected
            if (!redisClient.isOpen) {
                // If redis is down, allow the request but log a warning
                console.warn("[RATE LIMIT] Redis not connected, skipping rate limit check")
                return next()
            }

            const current = await redisClient.incr(key)

            if (current === 1) {
                // First request in window — set expiry
                await redisClient.expire(key, windowSeconds)
            }

            if (current > maxRequests) {
                const ttl = await redisClient.ttl(key)
                return res.status(429).json({
                    message: "Rate limit exceeded. Please try again later.",
                    retryAfter: ttl > 0 ? ttl : windowSeconds,
                })
            }

            // Attach remaining count to response headers
            res.setHeader("X-RateLimit-Limit", maxRequests)
            res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - current))

            next()
        } catch (error) {
            // If rate limiting fails, don't block the request
            console.error("[RATE LIMIT] Error:", error.message)
            next()
        }
    }
}
