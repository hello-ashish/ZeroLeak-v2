import mongoose from 'mongoose';
import { adminCohortReport } from './src/Services/ai/ai.service.js';
import { Result } from './src/models/result.models.js';
import { Student } from './src/models/student.models.js';
import { Exam } from './src/models/exam.models.js';
import { Question } from './src/models/question.models.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get real exam results
    const gradebookData = await Result.find({}).populate("student", "name studentId").populate("exam", "title").sort({ createdAt: -1 }).limit(5);
    
    console.log(`Sending ${gradebookData.length} records to AI`);
    const res = await adminCohortReport(gradebookData, "admin_id");
    console.log(JSON.stringify(res, null, 2));
    
    process.exit(0);
}
run().catch(console.error);
