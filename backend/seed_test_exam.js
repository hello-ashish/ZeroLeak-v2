import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Professor } from './src/models/professor.models.js';
import { Student } from './src/models/student.models.js';
import { Admin } from './src/models/admin.models.js';
import { Question } from './src/models/question.models.js';
import { Exam } from './src/models/exam.models.js';
import {
    encryptQuestionContent,
    hashQuestionContent,
} from './src/Services/crypto.service.js';
import { buildMerkleRoot } from './src/Services/merkle.service.js';

dotenv.config();

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        const profEmail = 'testprof@zeroleak.com';
        const professor = await Professor.findOne({ email: profEmail });
        
        // 1. Create a Test Question
        const sensitiveContent = {
            title: "What is 2 + 2?",
            options: ["3", "4", "5", "6"],
            correctAnswer: "4",
            correctAnswerIndex: 1,
        };

        const contentHash = hashQuestionContent(sensitiveContent);
        const encryptedContent = encryptQuestionContent(sensitiveContent);

        const question = await Question.create({
            encryptedContent,
            contentHash,
            difficultyLevel: "easy",
            subject: "Math",
            topic: "Addition",
            createdBy: professor._id,
        });

        console.log('✓ Test Question created:', question._id);

        // 2. Create a Test Exam
        const questionHashes = [contentHash];
        const questionMerkleRoot = buildMerkleRoot(questionHashes);

        let admin = await Admin.findOne({ email: 'admin@zeroleak.com' });
        if (!admin) {
            admin = await Admin.create({
                adminId: 'ADM-001',
                email: 'admin@zeroleak.com',
                password: 'AdminPassword123!'
            });
        }

        const exam = await Exam.create({
            title: "Test Math Exam",
            description: "A simple test exam to verify the encryption fix.",
            subject: "Math",
            date: new Date(),
            duration: 60,
            status: "Live",
            questions: [question._id],
            questionMerkleRoot,
            createdBy: admin._id,
            totalMarks: 1,
            passingMarks: 1
        });

        console.log('✓ Test Exam created:', exam._id);

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('✗ Seed failed:', error.message);
        process.exit(1);
    }
}

seed();
