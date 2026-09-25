import { Student } from "../models/student.models.js";
import { Professor } from "../models/professor.models.js";

/**
 * Role-based search rules:
 *   Admin   → can search students AND professors
 *   Auditor → can search students AND professors
 *   Professor → CANNOT search any users
 *   Student   → CANNOT search any users
 */
export const globalSearch = async (req, res) => {
    try {
        const role = req.userRole; // set by verifyAnyJWT middleware

        // Block Students and Professors from searching other users
        if (role === "Student" || role === "Professor") {
            return res.status(403).json({
                message: "You are not permitted to search for other users.",
                students: [],
                professors: []
            });
        }

        const { q } = req.query;
        if (!q || q.trim() === "") {
            return res.status(200).json({ students: [], professors: [] });
        }

        const regex = new RegExp(q, "i");

        const [students, professors] = await Promise.all([
            Student.find({
                $or: [
                    { name: regex },
                    { email: regex },
                    { studentId: regex }
                ]
            }).select("name email studentId department program batch").limit(10),
            Professor.find({
                $or: [
                    { name: regex },
                    { email: regex }
                ]
            }).select("name email contact").limit(10)
        ]);

        res.status(200).json({ students, professors });
    } catch (error) {
        console.error("Global search error:", error);
        res.status(500).json({ message: "Internal server error during search" });
    }
};
