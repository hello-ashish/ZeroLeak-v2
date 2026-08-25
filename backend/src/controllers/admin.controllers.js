import { Professor } from "../models/professor.models";

export const createProfessor = async (req, res) => {
    try {

        // getting the data from the req body (the form admin fills)
        const { id, name, email, contact, address, password } = req.body

        // validate the required fields are provided
        if (!id || !name || !email || !password) {
            return res.status(400).json({ message: "ID, name, email, and password are required fields." })
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