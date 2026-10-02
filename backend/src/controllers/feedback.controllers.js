import { Feedback } from "../models/feedback.models.js";
import { logAction } from "../controllers/admin.controllers.js";

// Create feedback
export const submitFeedback = async (req, res) => {
    try {
        const { category, subject, description, priority, context } = req.body;
        const user = req.user;
        const role = req.userRole; // set in verifyAnyJWT

        if (!user || !role) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const feedback = await Feedback.create({
            user: user._id,
            role,
            category,
            subject,
            description,
            priority,
            context
        });

        return res.status(201).json({ message: "Feedback submitted successfully", feedback });
    } catch (error) {
        console.error("Error submitting feedback:", error);
        return res.status(500).json({ message: "Error submitting feedback" });
    }
};

// Get feedback for current user
export const getMyFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find({ user: req.user._id }).sort({ createdAt: -1 });
        return res.status(200).json({ feedback });
    } catch (error) {
        console.error("Error fetching feedback:", error);
        return res.status(500).json({ message: "Error fetching feedback" });
    }
};

// Get all feedback (Admin)
export const getAllFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find().populate("user", "name email").sort({ createdAt: -1 });
        return res.status(200).json({ feedback });
    } catch (error) {
        console.error("Error fetching all feedback:", error);
        return res.status(500).json({ message: "Error fetching feedback" });
    }
};

// Update feedback status (Admin)
export const updateFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminResponse } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (adminResponse !== undefined) updateData.adminResponse = adminResponse;

        const feedback = await Feedback.findByIdAndUpdate(id, updateData, { new: true });
        
        if (!feedback) {
            return res.status(404).json({ message: "Feedback not found" });
        }

        // Log action if auditing is set up
        if (req.admin) {
            await logAction({ actor: req.admin.email, action: "FEEDBACK_UPDATED", targetType: "Feedback", targetId: feedback._id });
        }

        return res.status(200).json({ message: "Feedback updated successfully", feedback });
    } catch (error) {
        console.error("Error updating feedback:", error);
        return res.status(500).json({ message: "Error updating feedback" });
    }
};
