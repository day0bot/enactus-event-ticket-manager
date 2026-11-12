// backend/routes/Bookings.js
import express from "express";
import BookingController from "../controllers/BookingController.js";
import authorizationMiddleware from "../middleware/authorizationMiddleware.js";

const router = express.Router();

// Book tickets (Standard Users only)
router.post(
  "/",
  authorizationMiddleware(["Standard User"]),
  BookingController.createBooking
);

// Get booking details
router.get(
  "/:id",
  authorizationMiddleware(["Standard User"]),
  BookingController.getBookingById
);

// Cancel booking
router.delete(
  "/:id",
  authorizationMiddleware(["Standard User"]),
  BookingController.cancelBooking
);

export default router;
