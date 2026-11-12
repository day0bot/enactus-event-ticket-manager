import mongoose from "mongoose";

const schemaOptions = {
  strict: true,
  timestamps: true,
};

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserModel",
      required: true, // Fixed typo: "requied" -> "required"
    },
    token: {
      type: String,
      required: true, // Fixed typo: "requied" -> "required"
    },
    expiresAt: {
      type: Date,
      required: true, // Fixed typo: "requied" -> "required"
    },
  },
  schemaOptions
);

export default mongoose.model("Session", sessionSchema);
