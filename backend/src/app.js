import express from "express"
import cors from "cors"
import questionRouter from "./routes/question.routes.js"
import examRouter from "./routes/exam.routes.js"
import examinationRouter from "./routes/examination.routes.js"
import studentRouter from "./routes/student.routes.js"
import adminRouter from "./routes/admin.routes.js"
import professorRouter from "./routes/professor.routes.js"
import auditorRouter from "./routes/auditor.routes.js"
import cheatingRouter from "./routes/cheating.routes.js"
import blockchainRouter from "./routes/blockchain.routes.js"
import searchRouter from "./routes/search.routes.js"
import proctoringRouter from "./routes/proctoring.routes.js"
import aiRouter from "./routes/ai.routes.js"
import zmailRouter from "./routes/zmail.routes.js"
import supportRouter from "./routes/support.routes.js"
import { setupSwagger } from "./swagger.js"

const app = express()

// middleware setup
app.use(cors({
    origin: true,
    credentials: true
}))

// we need this to parse json data coming from requests (like req.body)
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))
app.use(express.static("public"))

// this says: any request starting with /api/admin goes to the adminRouter
app.use("/api/admin", adminRouter)
app.use("/api/admin/examinations", examinationRouter)
app.use("/api/admin/proctoring", proctoringRouter)
// http://localhost:4000/api/admin/

// this says: any request starting with /api/professor goes to the professorRouter
app.use("/api/professor", professorRouter)

// AI-assisted professor endpoints
app.use("/api/professor/ai", aiRouter)
// Global AI endpoints (for admin)
app.use("/api/ai", aiRouter)

// Tell the app to use our new question routes!
app.use("/api/question", questionRouter)
app.use("/api/questions", questionRouter)

// Exam route
app.use("/api/exams", examRouter)

// Student route
app.use("/api/students", studentRouter);

// Auditor route
app.use("/api/auditor", auditorRouter);

// Anti-cheating & security telemetry routes
app.use("/api/anti-cheating", cheatingRouter);

// Blockchain ledger route
app.use("/api/blockchain", blockchainRouter);

// Global search route
app.use("/api/search", searchRouter);

// ZMail internal messaging system
app.use("/api/zmail", zmailRouter);

// ZeroLeak Support System
app.use("/api/support", supportRouter);

setupSwagger(app);

export { app }