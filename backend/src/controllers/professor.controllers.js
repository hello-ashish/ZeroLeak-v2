import { Professor } from "../models/professor.models.js";
import { Batch } from "../models/batch.models.js"

export const loginProfessor = async (req, res) => {

    try {
        // get login credentials from the request body with a safe fallback
        const { id, email, password } = req.body || {}

        // validate that password and at least one identifier is provided
        if (!password) {
            return res.status(400).json({ message: "Password is required" })
        }
        if (!id && !email) {
            return res.status(400).json({ message: "ID or Email is required" })
        }

        // find the professor in the database using email or id
        const professor = await Professor.findOne({
            $or: [{ id }, { email }]
        })

        if (!professor) {
            return res.status(404).json({ message: "Professor not found" })
        }

        // check if password is correct using custom method
        const isPasswordCorrect = await professor.isPasswordCorrect(password)

        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Invalid Password" })
        }

        // generate JWT token for the professor
        const token = professor.generateAccessToken()

        // if login is successful, remove the password from the data
        const loggedInProfessor = await Professor.findById(professor._id).select("-password")

        // JWT for future

        return res.status(200).json({
            message: "Professor logged in successfully",
            token,
            professor: loggedInProfessor
        })
    } catch (error) {
        console.error("Error logging in professor: ", error)
        return res.status(500).json({
            message: "Internal server error while logging in professor"
        })
    }
}

// 1. Create a new Batch
export const createBatch = async (req, res) => {
    try {
        const { title, description, subject } = req.body

        const batch = await Batch.create({
            title, description, subject, createdBy: req.professor._id
        })
        res.status(201).json({
            message: "Batch created successfully", batch
        })
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}

// 2. Add Question to a Draft Batch
export const addQuestionToBatch = async (req, res) => {
    try {
        const { batchId } = req.params
        const questionData = req.body

        const batch = await Batch.findById(batchId)
        if(batch.status !== 'Draft' && batch.status !== 'MarkForReview') {
            return res.status(400).json({ message: "Can only edit Draft or Review batches." })
        }
        batch.questions.push(questionData)
        await batch.save()
        res.status(200).json({ message: "Question added", batch })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// 3. Submit Batch to Admin
export const submitBatch = async (req, res) => {
    try {
        const { batchId } = req.params
        const batch = await Batch.findByIdAndUpdate(batchId, {
            status: "Submitted" }, {new: true})
        res.status(200).json({ message: "Batch submitted to Admin", batch })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// 4. Get Professor's Batches (For History and Active views)
export const getMyBatches = async (req, res) => {
    try {
        const batches = await Batch.find({ createdBy: req.professor._id })
            .sort({ createdAt: -1 })
        res.status(200).json({batches})
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}