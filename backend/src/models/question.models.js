import mongoose from "mongoose"

const questionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },

    options: {
        type: [String],
        required: true,
    },

    correctAnswer: {
        type: String,
        required: true,
    },
    
    difficultyLevel: {
        type: String,
        enum: ["easy", "medium", "hard"],
        required: true,
    },

    subject: {
        type: String,
        required: true,
    },

    topic: {
        type: String,
        required: true,
    },

    correctAnswerIndex: {
        type: Number,
        required: true,
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Professor",
        required: true,
    },
}, {timestamps: true})

export const Question = mongoose.model("Question", questionSchema)