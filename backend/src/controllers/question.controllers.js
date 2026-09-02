import { Question } from "../models/question.models.js"

export const createQuestion = async (req, res) => {
    try {
        const { title, options, correctAnswer, difficultyLevel, subject, topic, correctAnswerIndex } = req.body

        if(!title || !options || !correctAnswer || !difficultyLevel || !subject || !topic || correctAnswerIndex === undefined) {
            return res.status(400).json({ message: "All fields are required" })
        }

        // Create the question in the DB.
        // Notice 'createdBy': We use `req.professor._id`. 
        // We only have access to `req.professor` because our Middleware bouncer attached it in the previous step!

        const question = await Question.create({
            title,
            options,
            correctAnswer,
            difficultyLevel,
            subject,
            topic,
            correctAnswerIndex,
            createdBy: req.professor._id // The professor is attached by our middleware bouncer
        })
        
        return res.status(201).json({
            message: "Question created successfully",
            question
        })
    } catch (error) {
        console.error("Error creating question: ", error)
        return res.status(500).json({
            message: "Internal server error while creating question"
        })
    }
}

export const getProfessorQuestions = async (req, res) => {
    try {
        const questions = await Question.find({
            createdBy: req.professor._id
        }).sort({ createdAt: -1 })

        return res.status(200).json({
            message: "Questions fetched successfully",
            questions
        })
    } catch (error) {
        console.error("Error fetching questions: ", error)
        return res.status(500).json({
            message: "Something went wrong while fetching questions"
        })
    }
}

export const getAllQuestions = async (req, res) => {
    try {
        const questions = await Question.find({}).sort({ createdAt: -1 })

        return res.status(200).json({
            message: "All questions fetched successfully",
            questions
        })
    } catch (error) {
        console.error("Error fetching all questions: ", error)
        return res.status(500).json({
            message: "Something went wrong while fetching all questions"
        })
    }
}