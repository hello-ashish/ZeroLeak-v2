import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Professor } from './src/models/professor.models.js';
import { Student } from './src/models/student.models.js';

dotenv.config();

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB');

        // Create professor
        const profEmail = 'testprof@zeroleak.com';
        const profPwd = 'TestProfessor123!';
        let professor = await Professor.findOne({ email: profEmail });
        if (!professor) {
            professor = await Professor.create({
                id: 'PROF-999',
                name: 'Test Professor',
                email: profEmail,
                contact: '1234567890',
                address: 'Test Address',
                password: profPwd
            });
            console.log('✓ Professor created');
        } else {
            professor.password = profPwd;
            await professor.save();
            console.log('✓ Professor updated');
        }

        // Create student
        const stuEmail = 'teststudent@zeroleak.com';
        const stuPwd = 'TestStudent123!';
        let student = await Student.findOne({ email: stuEmail });
        if (!student) {
            student = await Student.create({
                studentId: 'STU-999',
                name: 'Test Student',
                email: stuEmail,
                department: 'CS',
                batch: '2026',
                contact: '0987654321',
                address: 'Test Address',
                gender: 'Male',
                program: 'BTech',
                password: stuPwd
            });
            console.log('✓ Student created');
        } else {
            student.password = stuPwd;
            await student.save();
            console.log('✓ Student updated');
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('✗ Seed failed:', error.message);
        process.exit(1);
    }
}

seed();
