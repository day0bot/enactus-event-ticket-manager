import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
    {
        numberOfTicketsBooked: {
            type: Number,
            required: true,
            min: 1
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0
        },
        status: {
            type: String,
            enum: ["pending", "confirmed", "canceled"],
            default: "pending"
        },
        timestamp: { type: Date, default: Date.now },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        }
    }
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;