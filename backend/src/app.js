import express from "express"
import cors from "cors"

const app = express()

// middleware setup
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}))

// we need this to parse json data coming from requests (like req.body)
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))

import adminRouter from "./routes/admin.routes.js"
import professorRouter from "./routes/professor.routes.js"

// this says: any request starting with /api/admin goes to the adminRouter
app.use("/api/admin", adminRouter)
// http://localhost:4000/api/admin/

// this says: any request starting with /api/professor goes to the professorRouter
app.use("/api/professor", professorRouter)

export { app }