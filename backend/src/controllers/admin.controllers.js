import { Professor } from "../models/professor.models.js";
import { Admin } from "../models/admin.models.js"; 
import { Batch } from "../models/batch.models.js";
import { Question } from "../models/question.models.js";

// Register Admin
export const registerAdmin = async (req, res) => {
    try {
        const {adminId, email, password } = req.body

        // validate input
        if(!adminId || !email || !password){
            return res.status(400).json({ message: "adminId, email, and password are required" })
        }

        // check if admin already exists
        const exixtingAdmin = await Admin.findOne(
            { $or: [{ adminId }, { email }] }
        )

        if(exixtingAdmin){
            return res.status(400).json({ message: "Admin with this adminId or email already exists" })
        }

        // create new admin
        const admin = await Admin.create({ adminId, email, password })

        // remove password from the response for security
        const createdAdmin = await Admin.findById(admin._id).select("-password")

        return res.status(201).json({
            message: "Admin registered successfully",
            admin: createdAdmin
        })
    } catch (error) {
        console.error("Admin Registration Error:", error.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// Login Admin
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body
        if(!email || !password){
            return res.status(400).json({ message: "Email and password are required" })
        }

        const admin = await Admin.findOne({ email })
        if(!admin){
            return res.status(401).json({ message: "Invalid email or password" })
        }

        const isPasswordCorrect = await admin.isPasswordCorrect(password)
        if(!isPasswordCorrect){
            return res.status(401).json({ message: "Invalid credentials" })
        }

        // generate token
        const token = admin.generateAccessToken()

        const loggedInAdmin = await Admin.findById(admin._id).select("-password")
        
        // send the token back to the client
        return res.status(200).json({
            message: "Login successful",
            token,
            admin: loggedInAdmin
        })

    } catch (error) {
        console.error("Admin Login Error:", error.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

// Register Professor
export const createProfessor = async (req, res) => {
    try {

        // getting the data from the req body (the form admin fills)
        const { id, name, email, contact, address, password } = req.body || {}

        // validate the required fields are provided
        if (!id || !name || !email || !password) {
            return res.status(400).json({ message: "id, name, email, and password are required fields." })
        }

        // check if the user already exists
        const existingProfessor = await Professor.findOne({
            $or: [{ id }, { email }]
        })

        if (existingProfessor) {
            return res.status(400).json({ message: "A professor with this id or email already exists" })
        }

        // create the professor in the database
        const professor = await Professor.create({
            id,
            name,
            email,
            contact,
            address,
            password
        })

        // remove the password from the response for security
        const createdProfessor = await Professor.findById(professor._id).select("-password")

        // send success response back to the client
        return res.status(201).json({
            message: "Professor created successfully",
            professor: createdProfessor
        })

    } catch (error) {
        console.error("Error creating professor: ", error)
        return res.status(500).json({
            message: "Internal server error while creating professor"
        })
    }
}

// controller function to get all professors
export const getAllProfessors = async (req, res) => {
    try {
        // fetch all professsors from db, but exclide password field
        const professors = await Professor.find({}).select("-password")
        return res.status(200).json({
            professors
        })
    } catch (error) {
        console.error("Error fetching professors: ", error)
        return res.status(500).json({
            message: "Internal server error while fetching professors"
        })
    }
}

// controller function to delete a professor
export const deleteProfessor = async (req, res) => {
    try {
        // Get the id from the request parameters
        const { id } = req.params

        const deletedProfessor = await Professor.findOneAndDelete({ id })

        if (!deletedProfessor) {
            return res.status(404).json({
                message: "Professor not found"
            })
        }

        return res.status(200).json({
            message: "Professor deleted successfully"
        })
    } catch (error) {
        console.error("Error deleting professor: ", error)
        return res.status(500).json({
            message: "Internal server error while deleting professor"
        })
    }
}

// Get Batches
export const getBatches = async (req, res) => {
    try {
        const {status} = req.query
        const query = status ? {status} : {}
        const batches = await Batch.find(query)
            .populate('createdBy', 'name email')
        res.status(200).json({ batches })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Open Batch Details
export const openBatchDetails = async (req, res) => {
    try {
        const batch = await Batch.findByIdAndUpdate(req.params.batchId, { openedByAdmin: true }, { new: true })
            .populate('createdBy', 'name email')
        res.status(200).json({ batch })
    } catch (error) {
        res.status(500).json({ message: error.message})
    }
}

// Review Batch
export const reviewBatch = async (req, res) => {
    try {
        const { batchId } = req.params
        const { action, adminMessage} = req.body

        const batch = await Batch.findById(batchId)

        if (action === 'Accept'){
            const questionsToInsert = batch.questions.map(q => ({
                title: q.title, options: q.options, correctAnswer: q.correctAnswer,
                difficultyLevel: q.difficultyLevel, subject: q.subject, topic: q.topic,
                correctAnswerIndex: q.correctAnswerIndex, createdBy: batch.createdBy
            }))
            await Question.insertMany(questionsToInsert)

            batch.status = 'Accepted'
            batch.adminMessage = 'Batch Approved and added to Pool'
        }
        else if (action === 'Reject'){
            batch.status = 'Rejected'
            batch.adminMessage = adminMessage || 'Rejected without specific reason.'
            batch.questions = []
        }
        else if (action === 'MarkForReview') {
            batch.status = 'MarkForReview'
            batch.adminMessage = adminMessage || 'Please revise these questions.'
        }

        await batch.save()
        res.status(200).json({
            message: `Batch ${action}ed`, batch
        })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}
