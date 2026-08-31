import { Professor } from "../models/professor.models.js";

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