// backend/routes/Bookings.js
import express from "express";
import BookingController from "../controllers/BookingController.js";
import authorizationMiddleware from "../middleware/authorizationMiddleware.js";

const router = express.Router();

// Book tickets (All authenticated users)
router.post(
  "/",
  authorizationMiddleware(["Standard User", "Organizer", "System Admin"]),
  BookingController.createBooking
);

// Get booking details
router.get(
  "/:id",
  authorizationMiddleware(["Standard User", "Organizer", "System Admin"]),
  BookingController.getBookingById
);

// Cancel booking
router.delete(
  "/:id",
  authorizationMiddleware(["Standard User", "Organizer", "System Admin"]),
  BookingController.cancelBooking
);

export default router;
