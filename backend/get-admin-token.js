import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Admin } from './src/models/admin.models.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const admin = await Admin.findOne();
    if (admin) {
        const token = jwt.sign({ id: admin._id, role: 'admin' }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
        console.log("Token:", token);
    } else {
        console.log("No admin found");
    }
    process.exit(0);
}
run();
