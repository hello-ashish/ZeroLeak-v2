import cron from 'node-cron';
import { Exam } from '../models/exam.models.js';
import { Result } from '../models/result.models.js';

// Run every minute to check and update exam statuses
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();

        // 1. Move exams from "Scheduled" to "Live" if the start time has reached
        const scheduledExamsToStart = await Exam.find({
            status: 'Scheduled',
            scheduledAt: { $lte: now }
        });

        for (const exam of scheduledExamsToStart) {
            exam.status = 'Live';
            // If endsAt wasn't set, calculate it based on duration
            if (!exam.endsAt) {
                exam.endsAt = new Date(exam.scheduledAt.getTime() + (exam.durationMinutes || 60) * 60 * 1000);
            }
            await exam.save();
            console.log(`Exam Scheduler: Exam ${exam._id} (${exam.title}) moved to Live.`);
        }

        // 2. Move exams from "Live" to "Completed" if the end time has passed
        // Adding a 5-minute grace period before forcibly completing the exam for all students
        const gracePeriodMs = 5 * 60 * 1000;
        const liveExamsToEnd = await Exam.find({
            status: 'Live',
            endsAt: { $lte: new Date(now.getTime() - gracePeriodMs) }
        });

        for (const exam of liveExamsToEnd) {
            exam.status = 'Completed';
            await exam.save();
            console.log(`Exam Scheduler: Exam ${exam._id} (${exam.title}) moved to Completed.`);
            
            // Also update any InProgress results to Terminated (duration exceeded)
            const expiredResults = await Result.updateMany(
                { exam: exam._id, status: 'InProgress', resetByAdmin: { $ne: true } },
                { 
                    $set: { 
                        status: 'Terminated',
                        isTerminated: true,
                        terminationReason: "Exam duration exceeded."
                    }
                }
            );
            if (expiredResults.modifiedCount > 0) {
                console.log(`Exam Scheduler: Terminated ${expiredResults.modifiedCount} abandoned sessions for exam ${exam._id}.`);
            }
        }
    } catch (error) {
        console.error("Exam Scheduler Error:", error);
    }
});
