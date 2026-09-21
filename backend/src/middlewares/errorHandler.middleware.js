/**
 * Global error handler middleware.
 * In production, sanitizes error responses to prevent stack trace / internal detail leakage.
 * In development, passes through the full error for debugging.
 */
export const globalErrorHandler = (err, req, res, _next) => {
    const statusCode = err.statusCode || 500;

    if (process.env.NODE_ENV === 'production') {
        console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);
        return res.status(statusCode).json({
            message: statusCode === 500
                ? 'An internal server error occurred.'
                : err.message
        });
    }

    // Development: include full error details
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
    return res.status(statusCode).json({
        message: err.message,
        stack: err.stack
    });
};
