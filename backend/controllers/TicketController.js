import Ticket from "../models/TicketModel.js";
import EventModel from "../models/EventModel.js";
import crypto from "crypto";

const TicketController = {
  // Generate one or multiple tickets for an event
  generateTickets: async (req, res) => {
    try {
      const { eventId, quantity = 1, recipientName, recipientEmail, ticketType = "General Admission" } = req.body;

      if (!eventId) {
        return res.status(400).json({ message: "Event ID is required" });
      }

      const event = await EventModel.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const count = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 500); // Between 1 and 500 per batch
      const ticketsToCreate = [];

      // Generate unique ticket codes
      for (let i = 0; i < count; i++) {
        const uniqueSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
        const code = `ENACTUS-${uniqueSuffix}`;

        ticketsToCreate.push({
          ticketCode: code,
          event: eventId,
          recipientName: count === 1
            ? (recipientName || "General Attendee")
            : (recipientName ? `${recipientName} #${i + 1}` : `Attendee #${i + 1}`),
          recipientEmail: count === 1 && recipientEmail ? recipientEmail : (recipientEmail || ""),
          ticketType,
          status: "Valid",
          issuedBy: req.user?.userId || null,
        });
      }

      const createdTickets = await Ticket.insertMany(ticketsToCreate);

      // Decrement remainingTickets on event if remainingTickets > 0
      if (typeof event.remainingTickets === "number") {
        event.remainingTickets = Math.max(0, event.remainingTickets - count);
        await event.save();
      }

      return res.status(201).json({
        message: `Successfully generated ${count} ticket(s)`,
        count,
        tickets: createdTickets,
      });
    } catch (error) {
      console.error("Error generating tickets:", error);
      return res.status(500).json({ message: "Failed to generate tickets", error: error.message });
    }
  },

  // Get all tickets (optionally filtered by eventId)
  getTickets: async (req, res) => {
    try {
      const { eventId } = req.query;
      const filter = {};
      if (eventId) {
        filter.event = eventId;
      }

      const tickets = await Ticket.find(filter)
        .populate("event", "title date location ticketPricing")
        .populate("issuedBy", "name email")
        .sort({ createdAt: -1 });

      return res.status(200).json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      return res.status(500).json({ message: "Failed to fetch tickets", error: error.message });
    }
  },

  // Delete a ticket
  deleteTicket: async (req, res) => {
    try {
      const { id } = req.params;
      const ticket = await Ticket.findByIdAndDelete(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Restore remaining tickets on event if possible
      await EventModel.findByIdAndUpdate(ticket.event, {
        $inc: { remainingTickets: 1 },
      });

      return res.status(200).json({ message: "Ticket deleted successfully" });
    } catch (error) {
      console.error("Error deleting ticket:", error);
      return res.status(500).json({ message: "Failed to delete ticket", error: error.message });
    }
  },

  // Verify and check in a ticket at the venue/concert entrance
  verifyTicket: async (req, res) => {
    try {
      const { ticketCode, checkIn = false } = req.body;

      if (!ticketCode) {
        return res.status(400).json({ valid: false, message: "Ticket code is required" });
      }

      const formattedCode = ticketCode.trim().toUpperCase();
      const ticket = await Ticket.findOne({ ticketCode: formattedCode })
        .populate("event", "title date location");

      if (!ticket) {
        return res.status(404).json({
          valid: false,
          status: "NotFound",
          message: `Invalid Ticket: Code "${formattedCode}" not found!`,
        });
      }

      if (ticket.status === "Used") {
        return res.status(200).json({
          valid: false,
          status: "Used",
          message: "TICKET ALREADY USED! Previously admitted.",
          ticket,
        });
      }

      if (ticket.status === "Cancelled") {
        return res.status(200).json({
          valid: false,
          status: "Cancelled",
          message: "TICKET CANCELLED: Access denied.",
          ticket,
        });
      }

      // If checkIn requested, mark as Used
      if (checkIn) {
        ticket.status = "Used";
        await ticket.save();
        return res.status(200).json({
          valid: true,
          status: "Used",
          checkedIn: true,
          message: "VALID TICKET! Attendee admitted and checked in.",
          ticket,
        });
      }

      return res.status(200).json({
        valid: true,
        status: "Valid",
        checkedIn: false,
        message: "VALID TICKET! Ready for entrance check-in.",
        ticket,
      });
    } catch (error) {
      console.error("Error verifying ticket:", error);
      return res.status(500).json({ valid: false, message: "Verification failed", error: error.message });
    }
  },
};

export default TicketController;
