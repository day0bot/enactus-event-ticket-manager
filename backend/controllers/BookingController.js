import Booking from '../models/BookingModel.js';
import Event from '../models/EventModel.js';
import mongoose from 'mongoose';


const BookingController = {
  // Book event tickets
  createBooking: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { eventId, numberOfTickets } = req.body;
      const userId = req.user.userId; // Assuming user ID is available from auth middleware

      // Validate number of tickets
      if (numberOfTickets < 1) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Number of tickets must be at least 1' });
      }

      // Find event and check availability
      const event = await Event.findById(eventId).session(session);
      if (!event) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Event not found' });
      }

      // Check if enough tickets are available
      if (event.remainingTickets < numberOfTickets) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Not enough tickets available' });
      }

      // Calculate total price
      const totalPrice = numberOfTickets * event.ticketPricing;

      // Create booking
      const newBooking = new Booking({
        numberOfTicketsBooked: numberOfTickets,
        totalPrice,
        status: 'confirmed',
        user: userId,
        event: eventId
      });

      // Save booking
      const savedBooking = await newBooking.save({ session });

      // Update event ticket count
      event.remainingTickets -= numberOfTickets;
      await event.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json(savedBooking);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ message: 'Error creating booking', error: error.message });
    }
  },

  // Get booking details
  getBookingById: async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await Booking.findById(id)
          .populate('event', 'title date location ticketPricing')
          .populate('user', 'name email'); // Only return user's name and email

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Ensure user can only access their own bookings (unless admin)
      if (booking.user._id.toString() !== req.user.userId && req.user.role !== 'System Admin') {
        return res.status(403).json({ message: 'Unauthorized to access this booking' });
      }

      res.status(200).json(booking);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching booking', error: error.message });
    }
  },
  // Get all bookings for current user
  getUserBookings: async (req, res) => {
    try {
      const userId = req.user.userId;
      const bookings = await Booking.find({ user: userId })
          .populate('event', 'title date location')
          .sort({ timestamp: -1 });

      res.status(200).json(bookings);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user bookings', error: error.message });
    }
  },

  // Cancel booking
  cancelBooking: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { id } = req.params;
      const userId = req.user.userId;

      // Find booking
      const booking = await Booking.findById(id).session(session);

      if (!booking) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Ensure user can only cancel their own bookings (unless admin)
      if (booking.user.toString() !== userId && req.user.role !== 'System Admin') {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({ message: 'Unauthorized to cancel this booking' });
      }

      // Check if booking is already canceled
      if (booking.status === 'canceled') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Booking is already canceled' });
      }

      // Update booking status
      booking.status = 'canceled';
      await booking.save({ session });

      // Return tickets to event
      const event = await Event.findById(booking.event).session(session);
      event.remainingTickets += booking.numberOfTicketsBooked;
      await event.save({ session });

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({ message: 'Booking canceled successfully', booking });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      res.status(500).json({ message: 'Error canceling booking', error: error.message });
    }
  }};

export default BookingController;