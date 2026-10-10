import mongoose from 'mongoose';
import { Result } from './src/models/result.models.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await Result.findOne();
    if (result) {
        result.score += 1;
        await result.save();
        console.log("Modified result:", result._id);
    } else {
        console.log("No result found to modify.");
    }
    
    // wait a few seconds so changestream gets it
    setTimeout(() => {
        process.exit(0);
    }, 4000);
}
main();
