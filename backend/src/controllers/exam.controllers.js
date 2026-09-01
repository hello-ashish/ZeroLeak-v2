import { Exam } from "../models/exam.models.js"

export const createExam = async (req, res) => {
    try {
        const { title, description, durationMinutes, questions } = req.body

        if (!title || !description || !questions || questions.length === 0) {
            return res.status(400).json({ message: "Title, description, and at least one question are required." });
        }

        const newExam = await Exam.create({
            title,
            description,
            durationMinutes,
            questions,
            createdBy: req.professor._id
        })

        return res.status(201).json({ message: "Exam created successfully!", exam: newExam });
    } catch (error) {
        return res.status(500).json({ message: "Failed to create exam", error: error.message });
    }
}

export const getProfessorExams = async (req, res) => {
    try {
        const exams = await Exam.find({ createdBy: req.professor._id })
            .populate("questions")
            .sort({ createdAt: -1 })
        
        return res.status(200).json({ exams })
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch exams", error: error.message })
    }
}