import mongoose, { Schema } from "mongoose"

const userSchema = new Schema(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
        },
        fullname: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true
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

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10)
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

export const User = mongoose.model("User", userSchema)