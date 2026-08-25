import mongoose, { Schema } from "mongoose"
import bcrypt from "bcrypt"

const professorSchema = new Schema(
    {
        id: {
            type: String,
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        contact: {
            type: String,
            trim: true
        },
        address: {
            type: String,
            trim: true
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        }
    }, { timestamps: true }
)

professorSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

professorSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

export const Professor = mongoose.model("Professor", professorSchema)