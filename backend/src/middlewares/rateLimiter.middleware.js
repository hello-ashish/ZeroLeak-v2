import rateLimit from 'express-rate-limit';

// Global API rate limiter: 100 requests per 15 minutes
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        message: 'Too many requests from this IP, please try again after 15 minutes'
    },
    skip: (req) => {
        // Skip global limiting for authenticated users to avoid accidental blocking of normal exam traffic
        return !!(req.admin || req.professor || req.student || req.auditor);
    }
});

// Authentication routes rate limiter: 10 requests per 15 minutes
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
    }
});
