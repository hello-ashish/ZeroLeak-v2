import { Professor } from "../models/professor.models.js";
import { Admin } from "../models/admin.models.js";
import { Batch } from "../models/batch.models.js";
import { Question } from "../models/question.models.js";
import { Student } from "../models/student.models.js";
import { Exam } from "../models/exam.models.js";
import { Result } from "../models/result.models.js";
import { AuditLog } from "../models/auditlog.models.js";
import { buildMerkleRoot } from "../Services/merkle.service.js";
import { appendCommitment } from "../Services/blockchain.service.js";
import {
    encryptQuestionContent,
    hashQuestionContent,
} from "../Services/crypto.service.js";

// ─── Audit Log Helper ────────────────────────────────────────────────────────
const logAction = async ({ actor, actorRole = "Admin", action, targetType, targetId, targetLabel, details, status = "success" }) => {
    try {
        await AuditLog.create({ actor, actorRole, action, targetType, targetId: String(targetId || ""), targetLabel, details, status });
    } catch (err) {
        console.error("AuditLog Error:", err.message);
    }
};

// ─── Register Admin ───────────────────────────────────────────────────────────
export const registerAdmin = async (req, res) => {
    try {
        const { adminId, email, password } = req.body;
        if (!adminId || !email || !password) {
            return res.status(400).json({ message: "adminId, email, and password are required" });
        }
        const existingAdmin = await Admin.findOne({ $or: [{ adminId }, { email }] });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin with this adminId or email already exists" });
        }
        const admin = await Admin.create({ adminId, email, password });
        const createdAdmin = await Admin.findById(admin._id).select("-password");
        return res.status(201).json({ message: "Admin registered successfully", admin: createdAdmin });
    } catch (error) {
        console.error("Admin Registration Error:", error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Login Admin ──────────────────────────────────────────────────────────────
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const admin = await Admin.findOne({ email });
        if (!admin) return res.status(401).json({ message: "Invalid email or password" });
        const isPasswordCorrect = await admin.isPasswordCorrect(password);
        if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid credentials" });
        const token = admin.generateAccessToken();
        const loggedInAdmin = await Admin.findById(admin._id).select("-password");

        await logAction({ actor: email, action: "ADMIN_LOGIN", targetType: "Admin", targetId: admin._id, targetLabel: email });

        return res.status(200).json({ message: "Login successful", token, admin: loggedInAdmin });
    } catch (error) {
        console.error("Admin Login Error:", error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Create Professor ─────────────────────────────────────────────────────────
export const createProfessor = async (req, res) => {
    try {
        const { id, name, email, contact, address, password } = req.body || {};
        if (!id || !name || !email || !password) {
            return res.status(400).json({ message: "id, name, email, and password are required fields." });
        }
        const existingProfessor = await Professor.findOne({ $or: [{ id }, { email }] });
        if (existingProfessor) {
            return res.status(400).json({ message: "A professor with this id or email already exists" });
        }
        const professor = await Professor.create({ id, name, email, contact, address, password });
        const createdProfessor = await Professor.findById(professor._id).select("-password");

        await logAction({ actor: req.admin?.email, action: "PROFESSOR_CREATED", targetType: "Professor", targetId: professor._id, targetLabel: name });

        return res.status(201).json({ message: "Professor created successfully", professor: createdProfessor });
    } catch (error) {
        console.error("Error creating professor: ", error);
        return res.status(500).json({ message: "Internal server error while creating professor" });
    }
};

// ─── Get All Professors ───────────────────────────────────────────────────────
export const getAllProfessors = async (req, res) => {
    try {
        const professors = await Professor.find({}).select("-password").lean();
        const professorsWithCounts = await Promise.all(professors.map(async (prof) => {
            const count = await Batch.countDocuments({ 
                createdBy: prof._id, 
                status: { $in: ["Submitted", "Accepted", "Rejected", "MarkForReview"] } 
            });
            return { ...prof, submittedBatches: count };
        }));
        return res.status(200).json({ professors: professorsWithCounts });
    } catch (error) {
        console.error("Error fetching professors: ", error);
        return res.status(500).json({ message: "Internal server error while fetching professors" });
    }
};

// ─── Delete Professor ─────────────────────────────────────────────────────────
export const deleteProfessor = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProfessor = await Professor.findOneAndDelete({ id });
        if (!deletedProfessor) {
            return res.status(404).json({ message: "Professor not found" });
        }
        await logAction({ actor: req.admin?.email, action: "PROFESSOR_DELETED", targetType: "Professor", targetId: deletedProfessor._id, targetLabel: deletedProfessor.name });
        return res.status(200).json({ message: "Professor deleted successfully" });
    } catch (error) {
        console.error("Error deleting professor: ", error);
        return res.status(500).json({ message: "Internal server error while deleting professor" });
    }
};

// ─── Delete Student ───────────────────────────────────────────────────────────
export const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedStudent = await Student.findByIdAndDelete(id);
        if (!deletedStudent) {
            return res.status(404).json({ message: "Student not found" });
        }
        await logAction({ actor: req.admin?.email, action: "STUDENT_DELETED", targetType: "Student", targetId: deletedStudent._id, targetLabel: deletedStudent.name });
        return res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
        console.error("Error deleting student: ", error);
        return res.status(500).json({ message: "Internal server error while deleting student" });
    }
};

// ─── Get Batches ──────────────────────────────────────────────────────────────
export const getBatches = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status, isDeletedByAdmin: { $ne: true } } : { isDeletedByAdmin: { $ne: true } };
        const batches = await Batch.find(query).populate('createdBy', 'name email');
        res.status(200).json({ batches });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Open Batch Details ───────────────────────────────────────────────────────
export const openBatchDetails = async (req, res) => {
    try {
        const batch = await Batch.findByIdAndUpdate(
            req.params.batchId,
            { openedByAdmin: true },
            { new: true }
        ).populate('createdBy', 'name email');
        res.status(200).json({ batch });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Review Batch ─────────────────────────────────────────────────────────────
export const reviewBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { action, adminMessage } = req.body;
        const batch = await Batch.findById(batchId);

        if (!batch) return res.status(404).json({ message: "Batch not found" });

        if (action === 'Accept') {
            if (batch.status === 'Accepted' && batch.blockchainBlockHash) {
                return res.status(400).json({ message: 'Batch is already accepted and committed to the blockchain ledger.' });
            }

            if (!batch.questions || batch.questions.length === 0) {
                return res.status(400).json({ message: 'Cannot approve an empty batch.' });
            }

            const questionsToInsert = batch.questions.map((q) => {

                const sensitiveContent = {
                    title: q.title,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    correctAnswerIndex: q.correctAnswerIndex,
                };

                const contentHash =
                    hashQuestionContent(sensitiveContent);

                const encryptedContent =
                    encryptQuestionContent(sensitiveContent);

                return {
                    encryptedContent,
                    contentHash,
                    difficultyLevel: q.difficultyLevel,
                    subject: q.subject,
                    topic: q.topic,
                    createdBy: batch.createdBy,
                };
            });

            const insertedQuestions = await Question.insertMany(questionsToInsert);
            const questionHashes = insertedQuestions.map((question) => question.contentHash);
            const merkleRoot = buildMerkleRoot(questionHashes);

            let blockchainBlock;
            try {
                blockchainBlock = await appendCommitment({
                    blockType: "BATCH_COMMITMENT",
                    entityId: batch._id,
                    entityLabel: batch.title,
                    merkleRoot,
                    actorId: req.admin?._id,
                    actorRole: "Admin",
                    metadata: {
                        batchId: String(batch._id),
                        subject: batch.subject,
                        questionCount: insertedQuestions.length,
                        status: "Accepted",
                    },
                });
            } catch (blockchainError) {
                await Question.deleteMany({ _id: { $in: insertedQuestions.map((question) => question._id) } });
                throw new Error(`Batch approval rolled back: blockchain commitment failed (${blockchainError.message})`);
            }

            batch.merkleRoot = merkleRoot;
            batch.blockchainBlockIndex = blockchainBlock.blockIndex;
            batch.blockchainBlockHash = blockchainBlock.hash;
            batch.status = 'Accepted';
            batch.adminMessage = 'Batch Approved, integrity committed to blockchain ledger';
            await logAction({ actor: req.admin?.email, action: "BATCH_APPROVED", targetType: "Batch", targetId: batch._id, targetLabel: batch.title });
        } else if (action === 'Reject') {
            batch.status = 'Rejected';
            batch.adminMessage = adminMessage || 'Rejected without specific reason.';
            batch.questions = [];
            await logAction({ actor: req.admin?.email, action: "BATCH_REJECTED", targetType: "Batch", targetId: batch._id, targetLabel: batch.title, details: adminMessage });
        } else if (action === 'MarkForReview') {
            batch.status = 'MarkForReview';
            batch.adminMessage = adminMessage || 'Please revise these questions.';
            await logAction({ actor: req.admin?.email, action: "BATCH_MARKED_FOR_REVIEW", targetType: "Batch", targetId: batch._id, targetLabel: batch.title, details: adminMessage });
        }

        await batch.save();
        res.status(200).json({ message: `Batch ${action}ed`, batch });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── Delete Batch ─────────────────────────────────────────────────────────────
export const deleteBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        const batch = await Batch.findById(batchId);

        if (!batch) return res.status(404).json({ message: "Batch not found" });

        if (batch.status === 'Accepted' && batch.questions && batch.questions.length > 0) {
            const contentHashes = batch.questions.map(q => {
                const sensitiveContent = {
                    title: q.title,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    correctAnswerIndex: q.correctAnswerIndex,
                };
                return hashQuestionContent(sensitiveContent);
            });
            await Question.deleteMany({ contentHash: { $in: contentHashes } });
        }

        batch.isDeletedByAdmin = true;
        await batch.save();
        
        await logAction({ actor: req.admin?.email, action: "BATCH_DELETED", targetType: "Batch", targetId: batch._id, targetLabel: batch.title });

        res.status(200).json({ message: "Batch deleted successfully" });
    } catch (error) {
        console.error("Error deleting batch:", error.message);
        res.status(500).json({ message: "Error deleting batch" });
    }
};

// ─── Update Admin Profile ─────────────────────────────────────────────────────
export const updateAdminProfile = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findById(req.admin._id);
        if (email) admin.email = email;
        if (password) admin.password = password;
        await admin.save();
        const updatedAdmin = await Admin.findById(admin._id).select("-password");
        await logAction({ actor: admin.email, action: "ADMIN_PROFILE_UPDATED", targetType: "Admin", targetId: admin._id, targetLabel: admin.email });
        return res.status(200).json({ message: "Profile updated successfully", admin: updatedAdmin });
    } catch (error) {
        return res.status(500).json({ message: "Error updating profile", error: error.message });
    }
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
    try {
        const [
            studentCount,
            professorCount,
            examCount,
            questionCount,
            batchCount,
            pendingBatchCount,
            allResults,
            recentLogs,
            recentExams,
            liveExamsCount,
            studentsLastMonth
        ] = await Promise.all([
            Student.countDocuments(),
            Professor.countDocuments(),
            Exam.countDocuments(),
            Question.countDocuments(),
            Batch.countDocuments(),
            Batch.countDocuments({ status: "Submitted" }),
            Result.find({}).populate("student", "name studentId").populate("exam", "title"),
            AuditLog.find({}).sort({ createdAt: -1 }).limit(15),
            Exam.find({}).sort({ createdAt: -1 }).limit(5).populate("questions", "_id"),
            Exam.countDocuments({ status: "Live" }),
            Student.countDocuments({ createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
        ]);

        // Compute performance trend over the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentResults = allResults.filter(r => new Date(r.createdAt) >= sevenDaysAgo);
        
        const performanceMap = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            performanceMap[dateStr] = { date: dateStr, totalScore: 0, count: 0, passed: 0 };
        }
        
        recentResults.forEach(r => {
            const dateStr = new Date(r.createdAt).toISOString().split('T')[0];
            if (performanceMap[dateStr]) {
                const scorePct = (r.score / r.totalQuestions) * 100;
                performanceMap[dateStr].totalScore += scorePct;
                performanceMap[dateStr].count += 1;
                if (scorePct >= 50) performanceMap[dateStr].passed += 1;
            }
        });
        
        const performanceData = Object.values(performanceMap).map(day => ({
            date: day.date,
            score: day.count > 0 ? Math.round(day.totalScore / day.count) : 0,
            passRate: day.count > 0 ? Math.round((day.passed / day.count) * 100) : 0
        }));

        let scoreTrajectory = 0;
        if (performanceData.length === 7) {
            const recentAvg = (performanceData[4].score + performanceData[5].score + performanceData[6].score) / 3;
            const pastAvg = (performanceData[1].score + performanceData[2].score + performanceData[3].score) / 3;
            if (pastAvg > 0) {
                scoreTrajectory = (((recentAvg - pastAvg) / pastAvg) * 100).toFixed(1);
            } else if (recentAvg > 0) {
                scoreTrajectory = 100;
            }
        }

        // Compute pass rate and average score from Results
        let avgScore = 0;
        let passRate = 0;
        if (allResults.length > 0) {
            const totalPct = allResults.reduce((sum, r) => sum + (r.score / r.totalQuestions) * 100, 0);
            avgScore = Math.round(totalPct / allResults.length);
            const passed = allResults.filter(r => (r.score / r.totalQuestions) * 100 >= 50).length;
            passRate = Math.round((passed / allResults.length) * 100);
        }

        // Subject breakdown from questions
        const questionsBySubject = await Question.aggregate([
            { $group: { _id: "$subject", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Top and at-risk students (from results)
        const studentPerformance = {};
        const scoreDistribution = {
            below50: 0,
            fiftyToSixtyNine: 0,
            seventyToEightyNine: 0,
            above90: 0
        };

        for (const r of allResults) {
            const pct = (r.score / r.totalQuestions) * 100;
            if (pct < 50) scoreDistribution.below50 += 1;
            else if (pct < 70) scoreDistribution.fiftyToSixtyNine += 1;
            else if (pct < 90) scoreDistribution.seventyToEightyNine += 1;
            else scoreDistribution.above90 += 1;

            if (!r.student) continue;
            const sid = r.student._id.toString();
            if (!studentPerformance[sid]) {
                studentPerformance[sid] = { name: r.student.name, studentId: r.student.studentId, scores: [] };
            }
            studentPerformance[sid].scores.push(pct);
        }
        const studentStats = Object.values(studentPerformance).map(s => ({
            name: s.name,
            studentId: s.studentId,
            avgScore: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
            examsCount: s.scores.length
        }));
        const topStudents = [...studentStats].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);
        const atRiskStudents = [...studentStats].filter(s => s.avgScore < 50).sort((a, b) => a.avgScore - b.avgScore).slice(0, 5);

        return res.status(200).json({
            stats: {
                students: studentCount,
                professors: professorCount,
                exams: examCount,
                questions: questionCount,
                batches: batchCount,
                pendingBatches: pendingBatchCount,
                totalResults: allResults.length,
                avgScore,
                passRate,
                scoreDistribution,
                liveExamsCount,
                studentsLastMonth,
                scoreTrajectory
            },
            questionsBySubject,
            topStudents,
            atRiskStudents,
            recentLogs,
            recentExams,
            performanceData
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error.message);
        return res.status(500).json({ message: "Error fetching dashboard stats" });
    }
};

// ─── Get Audit Logs ───────────────────────────────────────────────────────────
export const getAuditLogs = async (req, res) => {
    try {
        const { page = 1, limit = 30 } = req.query;
        const logs = await AuditLog.find({})
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await AuditLog.countDocuments();
        return res.status(200).json({ logs, total });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching audit logs" });
    }
};

// ─── Update Exam Status ───────────────────────────────────────────────────────
export const updateExamStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, scheduledAt, endsAt } = req.body;
        const exam = await Exam.findByIdAndUpdate(id, { status, scheduledAt, endsAt }, { new: true });
        if (!exam) return res.status(404).json({ message: "Exam not found" });
        await logAction({ actor: req.admin?.email, action: `EXAM_${status.toUpperCase()}`, targetType: "Exam", targetId: exam._id, targetLabel: exam.title });
        return res.status(200).json({ message: "Exam status updated", exam });
    } catch (error) {
        return res.status(500).json({ message: "Error updating exam status" });
    }
};

// ─── Delete Exam ──────────────────────────────────────────────────────────────
export const deleteExam = async (req, res) => {
    try {
        const { id } = req.params;
        const exam = await Exam.findByIdAndDelete(id);
        if (!exam) return res.status(404).json({ message: "Exam not found" });

        // Cascade delete results associated with this exam
        await Result.deleteMany({ exam: id });

        await logAction({ actor: req.admin?.email, action: "EXAM_DELETED", targetType: "Exam", targetId: exam._id, targetLabel: exam.title });
        return res.status(200).json({ message: "Exam deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Error deleting exam" });
    }
};

// ─── Get Live Students ────────────────────────────────────────────────────────
export const getLiveStudents = async (req, res) => {
    try {
        // Find students who have pinged within the last 30 seconds
        const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
        const liveStudents = await Student.find({
            lastActiveAt: { $gte: thirtySecondsAgo },
            currentExamId: { $ne: null }
        }).select("-password").populate("currentExamId", "title");
        
        return res.status(200).json({ liveStudents });
    } catch (error) {
        console.error("Error fetching live students: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Toggle Block Student ─────────────────────────────────────────────────────
export const toggleBlockStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Student.findById(id);
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        student.isBlocked = !student.isBlocked;
        await student.save();
        
        await logAction({ 
            actor: req.admin?.email, 
            action: student.isBlocked ? "STUDENT_BLOCKED" : "STUDENT_UNBLOCKED", 
            targetType: "Student", 
            targetId: student._id, 
            targetLabel: student.name 
        });

        return res.status(200).json({ 
            message: `Student successfully ${student.isBlocked ? 'blocked' : 'unblocked'}`,
            isBlocked: student.isBlocked
        });
    } catch (error) {
        console.error("Error toggling block for student: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Toggle Block Professor ─────────────────────────────────────────────────────
export const toggleBlockProfessor = async (req, res) => {
    try {
        const { id } = req.params;
        const professor = await Professor.findById(id);
        if (!professor) {
            return res.status(404).json({ message: "Professor not found" });
        }

        professor.isBlocked = !professor.isBlocked;
        await professor.save();
        
        await logAction({ 
            actor: req.admin?.email, 
            action: professor.isBlocked ? "PROFESSOR_BLOCKED" : "PROFESSOR_UNBLOCKED", 
            targetType: "Professor", 
            targetId: professor._id, 
            targetLabel: professor.name 
        });

        return res.status(200).json({ 
            message: `Professor successfully ${professor.isBlocked ? 'blocked' : 'unblocked'}`,
            isBlocked: professor.isBlocked
        });
    } catch (error) {
        console.error("Error toggling block for professor: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Bulk Delete Professors ───────────────────────────────────────────────────
export const bulkDeleteProfessors = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No professor IDs provided" });
        }
        await Professor.deleteMany({ _id: { $in: ids } });
        await logAction({ actor: req.admin?.email, action: "PROFESSORS_BULK_DELETED", targetType: "Professor", targetLabel: `${ids.length} professors` });
        return res.status(200).json({ message: "Professors deleted successfully" });
    } catch (error) {
        console.error("Error bulk deleting professors: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Bulk Block Professors ─────────────────────────────────────────────────────
export const bulkBlockProfessors = async (req, res) => {
    try {
        const { ids, block } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No professor IDs provided" });
        }
        await Professor.updateMany({ _id: { $in: ids } }, { $set: { isBlocked: block } });
        await logAction({ actor: req.admin?.email, action: "PROFESSORS_BULK_BLOCKED", targetType: "Professor", targetLabel: `${ids.length} professors blocked=${block}` });
        return res.status(200).json({ message: `Professors ${block ? 'blocked' : 'unblocked'} successfully` });
    } catch (error) {
        console.error("Error bulk blocking professors: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Bulk Import Professors ─────────────────────────────────────────────────────
export const bulkImportProfessors = async (req, res) => {
    try {
        const { professors } = req.body;
        if (!Array.isArray(professors) || professors.length === 0) {
            return res.status(400).json({ message: "No professor data provided" });
        }

        let importedCount = 0;
        let skippedCount = 0;

        for (const profData of professors) {
            const rawProfessorId = profData.id || profData.professorid || profData['professor id'];
            const { name, email, password, contact, address } = profData;
            
            if (!rawProfessorId || !name || !email) {
                skippedCount++;
                continue;
            }

            const existingProfessor = await Professor.findOne({ $or: [{ id: rawProfessorId }, { email }] });
            if (existingProfessor) {
                skippedCount++;
                continue; // Skip duplicates
            }

            let finalPassword = password;
            if (!finalPassword) {
                const firstName = name.split(' ')[0];
                finalPassword = `hello${firstName}`;
            }

            const cleanData = { id: rawProfessorId, name, email, password: finalPassword, contact, address };
            await Professor.create(cleanData);
            importedCount++;
        }

        await logAction({ actor: req.admin?.email, action: "PROFESSORS_BULK_IMPORTED", targetType: "Professor", targetLabel: `${importedCount} professors imported` });

        return res.status(200).json({ 
            message: "Import complete", 
            imported: importedCount, 
            skipped: skippedCount 
        });
    } catch (error) {
        console.error("Error bulk importing professors: ", error);
        return res.status(500).json({ message: "Internal server error during import" });
    }
};

// ─── Bulk Delete Students ─────────────────────────────────────────────────────
export const bulkDeleteStudents = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No student IDs provided" });
        }
        await Student.deleteMany({ _id: { $in: ids } });
        await logAction({ actor: req.admin?.email, action: "STUDENTS_BULK_DELETED", targetType: "Student", targetLabel: `${ids.length} students` });
        return res.status(200).json({ message: "Students deleted successfully" });
    } catch (error) {
        console.error("Error bulk deleting students: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Bulk Block Students ─────────────────────────────────────────────────────
export const bulkBlockStudents = async (req, res) => {
    try {
        const { ids, block } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: "No student IDs provided" });
        }
        await Student.updateMany({ _id: { $in: ids } }, { $set: { isBlocked: block } });
        await logAction({ actor: req.admin?.email, action: "STUDENTS_BULK_BLOCKED", targetType: "Student", targetLabel: `${ids.length} students blocked=${block}` });
        return res.status(200).json({ message: `Students ${block ? 'blocked' : 'unblocked'} successfully` });
    } catch (error) {
        console.error("Error bulk blocking students: ", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Bulk Import Students ─────────────────────────────────────────────────────
export const bulkImportStudents = async (req, res) => {
    try {
        const { students } = req.body;
        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ message: "No student data provided" });
        }

        let importedCount = 0;
        let skippedCount = 0;

        for (const stuData of students) {
            const rawStudentId = stuData.studentId || stuData.studentid;
            const { name, email, password, department, batch, contact, dateOfBirth, address, gender, program } = stuData;
            
            if (!rawStudentId || !name || !email) {
                skippedCount++;
                continue;
            }

            const existingStudent = await Student.findOne({ $or: [{ studentId: rawStudentId }, { email }] });
            if (existingStudent) {
                skippedCount++;
                continue; // Skip duplicates
            }

            let finalPassword = password;
            if (!finalPassword) {
                const firstName = name.split(' ')[0];
                finalPassword = `hello${firstName}`;
            }

            const cleanData = { studentId: rawStudentId, name, email, password: finalPassword, department, batch, contact, address, gender, program };
            if (dateOfBirth) cleanData.dateOfBirth = dateOfBirth;

            await Student.create(cleanData);
            importedCount++;
        }

        await logAction({ actor: req.admin?.email, action: "STUDENTS_BULK_IMPORTED", targetType: "Student", targetLabel: `${importedCount} students imported` });

        return res.status(200).json({ 
            message: "Import complete", 
            imported: importedCount, 
            skipped: skippedCount 
        });
    } catch (error) {
        console.error("Error bulk importing students: ", error);
        return res.status(500).json({ message: "Internal server error during import" });
    }
};