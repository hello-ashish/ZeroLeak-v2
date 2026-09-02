import { Student } from "../models/student.models.js"
import { Exam } from "../models/exam.models.js"
import { Result } from "../models/result.models.js";

// 1. Register Student
export const registerStudent = async (req, res) => {
    try {
        const { studentId, name, email, password } = req.body;
        if (!studentId || !name || !email || !password) return res.status(400).json({ message: "All fields required" });
        const existingStudent = await Student.findOne({ $or: [{ studentId }, { email }] });
        if (existingStudent) return res.status(400).json({ message: "Student already exists" });
        const student = await Student.create({ studentId, name, email, password });
        const createdStudent = await Student.findById(student._id).select("-password");
        return res.status(201).json({ message: "Student registered", student: createdStudent });
    } catch (error) {
        return res.status(500).json({ message: "Error registering student", error: error.message });
    }
}

// 2. Login Student
export const loginStudent = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password required" });
        const student = await Student.findOne({ email });
        if (!student) return res.status(404).json({ message: "Student not found" });
        const isPasswordValid = await student.isPasswordCorrect(password);
        if (!isPasswordValid) return res.status(401).json({ message: "Invalid credentials" });
        const token = student.generateAccessToken();
        const loggedInStudent = await Student.findById(student._id).select("-password");
        return res.status(200).json({ message: "Login successful", token, student: loggedInStudent });
    } catch (error) {
        return res.status(500).json({ message: "Error logging in", error: error.message });
    }
}

// 3. Get all available Exams for Students to see!
export const getAvailableExams = async (req, res) => {
    try {
        // We fetch ALL exams, and we use .populate to inject the Professor's name into the "createdBy" field!
        const exams = await Exam.find().populate("createdBy", "name").sort({ createdAt: -1 });
        return res.status(200).json({ exams });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching exams", error: error.message });
    }
}

// 4. Fetch all students (for Admins only)
export const getAllStudents = async (req, res) => {
    try {
        const students = await Student.find().select("-password").sort({ createdAt: -1 });
        return res.status(200).json({ students });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching students", error: error.message });
    }
}

// 5. Fetch a single exam by its id
export const getExamById = async (req, res) => {
    try {
        const { id } = req.params
        const exam = await Exam.findById(id)
            .populate("createdBy", "name")
            .populate("questions")
        
        if (!exam) return res.status(404).json({ message: "Exam not found" })
        
        return res.status(200).json({ exam })
    } catch (error) {
        return res.status(500).json({ message: "Error fetching exam", error: error.message })
    }
}

// 6. Save exam score to the database
export const submitExamResult = async (req, res) => {
    try {
        const { examId, score, totalQuestions } = req.body

        if(!examId || score === undefined || !totalQuestions) {
            return res.status(400).json({ message: "Exam ID, score, and total questions are required" });
        }

        const result = await Result.create({
            student: req.student._id,
            exam: examId,
            score: score,
            totalQuestions: totalQuestions
        })
        return res.status(201).json({ message: "Result saved successfully", result })
    } catch (error) {
        return res.status(500).json({ message: "Error saving result", error: error.message })
    }
}

// 7. Fetch all results for the logged-in student
export const getStudentResults = async (req, res) => {
    try {
        const results = await Result.find({ student: req.student._id })
            .populate("exam", "title")
            .sort({ createdAt: -1 })
        return res.status(200).json({ results })
    } catch (error) {
        return res.status(500).json({ message: "Error fetching results", error: error.message })
    }
}