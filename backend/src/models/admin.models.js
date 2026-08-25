import mongoose, { Schema } from "mongoose"
import bcrypt from "bcrypt"

const adminSchema = new Schema(
    {
        adminId: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        }
    }, { timestamps: true }
)

adminSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10)
})

adminSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

export const Admin = mongoose.models("Admin", adminSchema)