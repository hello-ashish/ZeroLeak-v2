import { Exam } from "../models/exam.models.js";
import { Result } from "../models/result.models.js";

export const createExam = async (req, res) => {
    try {
        const { title, description, duration, questions } = req.body;

        if (!title || !description || !questions || questions.length === 0) {
            return res.status(400).json({ message: "Title, description, and at least one question are required." });
        }

        const exam = await Exam.create({
            title,
            description,
            durationMinutes: duration || 60,
            createdBy: req.admin._id,
            questions
        });

        return res.status(201).json({
            message: "Exam created successfully",
            exam
        });
    } catch (error) {
        console.error("Error creating exam: ", error);
        return res.status(500).json({ message: "Internal server error while creating exam" });
    }
};

export const getExams = async (req, res) => {
    try {
        const exams = await Exam.find({}).sort({ createdAt: -1 });
        return res.status(200).json({
            message: "Exams fetched successfully",
            exams
        });
    } catch (error) {
        console.error("Error fetching exams: ", error);
        return res.status(500).json({ message: "Something went wrong while fetching exams" });
    }
};

export const getExamResults = async (req, res) => {
    try {
        const results = await Result.find({})
            .populate("student", "name studentId")
            .populate("exam", "title")
            .sort({ createdAt: -1 });
            
        return res.status(200).json({
            message: "Results fetched successfully",
            results
        });
    } catch (error) {
        console.error("Error fetching results: ", error);
        return res.status(500).json({ message: "Something went wrong while fetching results" });
    }
};
