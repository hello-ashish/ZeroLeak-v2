import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;
        const collection = db.collection("batches");
        const indexes = await collection.indexes();
        
        let textIndexName = null;
        for (const idx of indexes) {
            // Find the text index
            if (idx.key && Object.values(idx.key).includes("text")) {
                textIndexName = idx.name;
                break;
            }
        }

        if (textIndexName) {
            console.log(`Dropping old text index: ${textIndexName}`);
            await collection.dropIndex(textIndexName);
            console.log("Successfully dropped index.");
        } else {
            console.log("No text index found to drop.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
};

run();
