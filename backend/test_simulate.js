import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI);

import { simulatePaper } from './src/controllers/question.controllers.js';

const mockReq = { query: { subject: 'Physics', numQuestions: 10 } };
const mockRes = {
  status: (code) => ({
    json: (data) => {
      console.log('STATUS:', code);
      console.log('DATA:', JSON.stringify(data).substring(0, 500));
      process.exit(0);
    }
  })
};

setTimeout(async () => {
    try {
        await simulatePaper(mockReq, mockRes);
    } catch(e) {
        console.error("CRASH:", e);
        process.exit(1);
    }
}, 2000);
