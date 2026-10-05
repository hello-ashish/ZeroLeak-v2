import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const TestSchema = new mongoose.Schema({ status: String });
  const TestModel = mongoose.model("TestBulkWrite", TestSchema);
  
  const doc = await TestModel.create({ status: "ACTIVE" });
  const idStr = doc._id.toString();
  
  await TestModel.bulkWrite([{ updateOne: { filter: { _id: idStr }, update: { $set: { status: "OFFLINE" } } } }]);
  const updated = await TestModel.findById(doc._id);
  console.log("Updated status:", updated.status);
  process.exit(0);
}
run();
