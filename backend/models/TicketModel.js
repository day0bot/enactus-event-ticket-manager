import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    recipientName: {
      type: String,
      default: "Guest",
      trim: true,
    },
    recipientEmail: {
      type: String,
      default: "",
      trim: true,
    },
    ticketType: {
      type: String,
      enum: ["General Admission", "VIP", "Delegate", "Speaker", "Team Member"],
      default: "General Admission",
    },
    status: {
      type: String,
      enum: ["Valid", "Used", "Cancelled"],
      default: "Valid",
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);
export default Ticket;
