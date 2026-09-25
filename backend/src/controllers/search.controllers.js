import { Student } from "../models/student.models.js";
import { Professor } from "../models/professor.models.js";
import { Batch } from "../models/batch.models.js";
import { Exam } from "../models/exam.models.js";

/**
 * Role-based search rules:
 *   Admin/Auditor → can search students, professors, batches, exams
 *   Professor → can search their own batches and exams
 *   Student   → can search exams
 */
export const globalSearch = async (req, res) => {
    try {
        const role = req.userRole; // set by verifyAnyJWT middleware
        const { q } = req.query;
        if (!q || q.trim() === "") {
            return res.status(200).json({ students: [], professors: [], batches: [], exams: [] });
        }

        const regex = new RegExp(q, "i");

        let students = [], professors = [], batches = [], exams = [];

        if (role === "Admin" || role === "Auditor") {
            [students, professors, batches, exams] = await Promise.all([
                Student.find({
                    $or: [{ name: regex }, { email: regex }, { studentId: regex }]
                }).select("name email studentId department program batch").limit(10),
                Professor.find({
                    $or: [{ name: regex }, { email: regex }]
                }).select("name email contact").limit(10),
                Batch.find({
                    $or: [{ name: regex }, { subject: regex }]
                }).select("name subject status").limit(10),
                Exam.find({
                    $or: [{ title: regex }, { subject: regex }]
                }).select("title subject status").limit(10)
            ]);
        } else if (role === "Professor") {
            [batches, exams] = await Promise.all([
                Batch.find({
                    professor: req.user._id,
                    $or: [{ name: regex }, { subject: regex }]
                }).select("name subject status").limit(10)
            ]);
        } else if (role === "Student") {
            exams = await Exam.find({
                $or: [{ title: regex }, { subject: regex }]
            }).select("title subject status").limit(10);
        }

        res.status(200).json({ students, professors, batches, exams });
    } catch (error) {
        console.error("Global search error:", error);
        res.status(500).json({ message: "Internal server error during search" });
    }
};
