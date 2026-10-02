import { Router } from "express";
import { verifyAnyJWT, verifyAdminJWT } from "../middlewares/auth.middleware.js";
import { submitFeedback, getMyFeedback, getAllFeedback, updateFeedback } from "../controllers/feedback.controllers.js";

const router = Router();

// Student/User routes
router.post("/submit", verifyAnyJWT, submitFeedback);
router.get("/my", verifyAnyJWT, getMyFeedback);

// Admin routes
router.get("/all", verifyAdminJWT, getAllFeedback);
router.put("/:id", verifyAdminJWT, updateFeedback);

export default router;
