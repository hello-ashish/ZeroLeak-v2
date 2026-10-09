/**
 * Jest configuration for ESM (type: "module") project
 */
export default {
    // Use experimental VM modules for native ESM support
    testEnvironment: "node",

    // Transform nothing — Node handles ESM natively via --experimental-vm-modules
    transform: {},

    // Find tests in tests/ directory
    testMatch: ["**/tests/**/*.test.js"],

    // Collect coverage from src
    collectCoverageFrom: [
        "src/controllers/**/*.js",
        "src/Services/**/*.js",
        "src/middlewares/**/*.js",
    ],

    // Setup files
    setupFilesAfterFramework: [],

    // Increase timeout for DB-dependent tests
    testTimeout: 15000,

    // Verbose output
    verbose: true,
};
