import { adminCohortReport, adminAuditSummary } from "./src/Services/ai/ai.service.js";

async function run() {
    console.log("Testing cohort...");
    const res1 = await adminCohortReport([{}], "admin_id");
    console.log("Cohort:", res1);
    
    console.log("Testing summary...");
    const res2 = await adminAuditSummary([{}], "admin_id");
    console.log("Summary:", res2);
}
run().catch(console.error);
