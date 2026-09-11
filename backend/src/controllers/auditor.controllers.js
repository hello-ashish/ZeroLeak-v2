import { Auditor } from "../models/auditor.models.js";
import { AuditLog } from "../models/auditlog.models.js";
import { Anomaly } from "../models/anomaly.models.js";
import { Exam } from "../models/exam.models.js";
import { Student } from "../models/student.models.js";
import { Professor } from "../models/professor.models.js";
import { Result } from "../models/result.models.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// ─── Register Auditor (For setup) ─────────────────────────────────────────────
export const registerAuditor = async (req, res) => {
    try {
        const { auditorId, email, password, name } = req.body;
        if (!auditorId || !email || !password || !name) {
            return res.status(400).json({ message: "auditorId, name, email, and password are required" });
        }
        const existing = await Auditor.findOne({ $or: [{ auditorId }, { email }] });
        if (existing) {
            return res.status(400).json({ message: "Auditor already exists" });
        }
        const auditor = await Auditor.create({ auditorId, email, password, name });
        const created = await Auditor.findById(auditor._id).select("-password");
        return res.status(201).json({ message: "Auditor registered successfully", auditor: created });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Login Auditor ────────────────────────────────────────────────────────────
export const loginAuditor = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const auditor = await Auditor.findOne({ email });
        if (!auditor) return res.status(401).json({ message: "Invalid email or password" });

        const isPasswordCorrect = await auditor.isPasswordCorrect(password);
        if (!isPasswordCorrect) return res.status(401).json({ message: "Invalid credentials" });

        const token = auditor.generateAccessToken();
        const loggedIn = await Auditor.findById(auditor._id).select("-password");

        await AuditLog.create({
            actor: email,
            actorRole: "System", // Or Auditor if we add it to the enum later
            action: "AUDITOR_LOGIN",
            targetType: "Auditor",
            targetId: auditor._id,
            targetLabel: email
        });

        return res.status(200).json({ message: "Login successful", token, auditor: loggedIn });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ─── Get Dashboard Metrics ──────────────────────────────────────────────────
export const getDashboardMetrics = async (req, res) => {
    try {
        const [totalLogs, highRiskLogs, activeAnomalies, recentLogs] = await Promise.all([
            AuditLog.countDocuments(),
            AuditLog.countDocuments({ action: { $in: ["ADMIN_LOGIN", "BATCH_REJECTED", "EXAM_DELETED", "STUDENT_DELETED", "PROFESSOR_DELETED"] } }), // Mocking high risk logic
            Anomaly.countDocuments({ status: { $in: ["Open", "Under Review"] } }),
            AuditLog.find().sort({ createdAt: -1 }).limit(10)
        ]);

        return res.status(200).json({
            metrics: {
                totalEvents: totalLogs,
                highRiskEvents: highRiskLogs,
                openAnomalies: activeAnomalies,
                loggingStatus: "Operational"
            },
            recentLogs
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching dashboard metrics" });
    }
};

// ─── Get Audit Logs (Explorer) ──────────────────────────────────────────────
export const getAuditLogs = async (req, res) => {
    try {
        const { page = 1, limit = 50, action, actor, sort = "-createdAt" } = req.query;
        let query = {};
        if (action) query.action = { $regex: action, $options: "i" };
        if (actor) query.actor = { $regex: actor, $options: "i" };

        const logs = await AuditLog.find(query)
            .sort(sort)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await AuditLog.countDocuments(query);

        return res.status(200).json({ logs, total });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching logs" });
    }
};

// ─── Get Anomalies ──────────────────────────────────────────────────────────
export const getAnomalies = async (req, res) => {
    try {
        const anomalies = await Anomaly.find().sort({ createdAt: -1 }).populate("relatedEvents");
        return res.status(200).json({ anomalies });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching anomalies" });
    }
};

// ─── Update Anomaly Status ──────────────────────────────────────────────────
export const updateAnomalyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        const anomaly = await Anomaly.findById(id);
        if (!anomaly) return res.status(404).json({ message: "Anomaly not found" });

        if (status) anomaly.status = status;
        if (note) {
            anomaly.notes.push({ text: note, addedBy: req.auditor.email });
        }

        await anomaly.save();

        await AuditLog.create({
            actor: req.auditor.email,
            actorRole: "System",
            action: "ANOMALY_UPDATED",
            targetType: "Anomaly",
            targetId: anomaly._id,
            targetLabel: anomaly.rule,
            details: `Status changed to ${status}`
        });

        return res.status(200).json({ message: "Anomaly updated", anomaly });
    } catch (error) {
        return res.status(500).json({ message: "Error updating anomaly" });
    }
};

// ─── Run Anomaly Scan (Triggered by Auditor manually or via cron) ───────────
export const scanAnomalies = async (req, res) => {
    try {
        // Detect rule: Multiple failed logins (simulated by multiple identical rapid requests or just looking for patterns)
        // Since we don't have failed login events logged in the DB currently, we will mock rule detection or detect other real events.
        // For example: Detect if an exam was deleted.
        const deletedExamsLogs = await AuditLog.find({ action: "EXAM_DELETED" });
        for (const log of deletedExamsLogs) {
            const exists = await Anomaly.findOne({ targetId: log.targetId, rule: "Exam Deleted" });
            if (!exists) {
                await Anomaly.create({
                    rule: "Exam Deleted",
                    description: `An exam (${log.targetLabel}) was deleted by ${log.actor}.`,
                    severity: "High",
                    category: "Content Changes",
                    targetType: "Exam",
                    targetId: log.targetId,
                    actor: log.actor,
                    relatedEvents: [log._id]
                });
            }
        }

        // Another rule: Batch Rejected
        const rejectedBatchesLogs = await AuditLog.find({ action: "BATCH_REJECTED" });
        for (const log of rejectedBatchesLogs) {
            const exists = await Anomaly.findOne({ targetId: log.targetId, rule: "Batch Rejected" });
            if (!exists) {
                await Anomaly.create({
                    rule: "Batch Rejected",
                    description: `A batch of questions (${log.targetLabel}) was rejected by ${log.actor}.`,
                    severity: "Medium",
                    category: "Batch Operations",
                    targetType: "Batch",
                    targetId: log.targetId,
                    actor: log.actor,
                    relatedEvents: [log._id]
                });
            }
        }

        return res.status(200).json({ message: "Anomaly scan completed." });
    } catch (error) {
        return res.status(500).json({ message: "Error scanning for anomalies" });
    }
};

// ─── Get Read-Only Data ─────────────────────────────────────────────────────
export const getExams = async (req, res) => {
    try {
        const exams = await Exam.find().select("-questions").sort({ createdAt: -1 });
        return res.status(200).json({ exams });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching exams" });
    }
};

export const getStudents = async (req, res) => {
    try {
        const students = await Student.find().select("-password").sort({ createdAt: -1 });
        return res.status(200).json({ students });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching students" });
    }
};

export const getProfessors = async (req, res) => {
    try {
        const professors = await Professor.find().select("-password").sort({ createdAt: -1 });
        return res.status(200).json({ professors });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching professors" });
    }
};
