import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    category: { type: String },
    image: { data: Buffer, contentType: String },
    status: {
      type: String,
      enum: ["approved", "pending", "declined"],
      default: "pending",
      required: true,
    },
    ticketPricing: {
      type: Number,
      required: true,
      min: 0,
    }, // Ticket pricing
    totalTickets: {
      type: Number,
      required: true,
      min: 0,
    }, // Total amount of tickets
    remainingTickets: {
      type: Number,
      required: true,
      min: 0,
    }, // Remaining tickets
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // Organizer Ref
  },
  { timestamps: true }
);

const EventModel = mongoose.model("Event", eventSchema);
export default EventModel;
