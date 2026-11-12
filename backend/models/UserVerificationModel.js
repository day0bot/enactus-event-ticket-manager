import mongoose from "mongoose";
const UserVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    uniqueString: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 3600, // 1 hour in seconds
    },
    expirationDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);
const UserVerification = mongoose.model(
  "UserVerification",
  UserVerificationSchema
);
export default UserVerification;
