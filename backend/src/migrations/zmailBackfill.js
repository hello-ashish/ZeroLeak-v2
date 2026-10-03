/**
 * ZMail Backfill Migration Script
 *
 * Creates ZMailAccount documents for all existing ZeroLeak users.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   node backend/src/migrations/zmailBackfill.js
 *
 * Or trigger via API (admin only):
 *   POST /api/zmail/admin/backfill
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

import connectDB from "../db/index.js";
import { backfillAllUsers } from "../Services/zmail/zmailIdentity.service.js";

async function run() {
    console.log("[ZMAIL BACKFILL] Starting...");
    await connectDB();

    const results = await backfillAllUsers();

    console.log("[ZMAIL BACKFILL] Complete:");
    console.log(`  Created: ${results.created}`);
    console.log(`  Skipped (already had account): ${results.skipped}`);
    if (results.errors.length > 0) {
        console.warn(`  Errors: ${results.errors.length}`);
        for (const e of results.errors) {
            console.warn(`    - userId=${e.userId}: ${e.error}`);
        }
    }

    process.exit(0);
}

run().catch((err) => {
    console.error("[ZMAIL BACKFILL] Fatal error:", err);
    process.exit(1);
});
