import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"

dotenv.config({
    path: './.env'
})

// first connect the database
connectDB()
    .then(() => {
        app.listen(process.env.PORT || 4000, () => {
            console.log(`Server is running on port : ${process.env.PORT || 4000}`)
        })
    })
    .catch((error) => {
        console.log("MongoDB connection error : ", error)
        process.exit(1)
    })