import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["Standard User", "Organizer", "System Admin"],
      default: "Standard User",
    },
      resetPassToken: { type: String, default: null },
      resetPassExpires: { type: Date, default: null },
  },
  { timestamps: true }
);
const User = mongoose.model("User", userSchema);

export default User;
