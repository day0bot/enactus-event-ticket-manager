import EventModel from "../models/EventModel.js";
import UserModel from "../models/UserModel.js";
const EventController = {
  CreateEvent: async (req, res) => {
    try {
      const {
        title,
        description,
        date,
        location,
        ticketPricing,
        totalTickets,
        category,
      } = req.body;

      // Get the organizer ID from the authenticated user
      const organizerId = req.user.userId;

      // Validate if the organizer exists and is an organizer
      const organizer = await UserModel.findById(organizerId);
      if (!organizer) {
        return res.status(404).json({ message: "Organizer not found" });
      }

      if (organizer.role !== "Organizer") {
        return res.status(403).json({ message: "User is not an organizer" });
      }

      const newEvent = new EventModel({
        title,
        description,
        date,
        location,
        organizer: organizerId,
        ticketPricing,
        totalTickets,
        remainingTickets: totalTickets, // Initially, remaining tickets equals total tickets
        category,
        status: 'pending' // New events start with pending status
      });

      const savedEvent = await newEvent.save();
      res.status(201).json(savedEvent);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Error creating event", error: error.message });
    }
  },
  GetAllApprovedEvents: async (req, res) => {
    try {
      const events = await EventModel.find({ status: 'approved' });
      res.status(200).json(events);
    } catch (error) {
      console.error("Error fetching approved events:", error);
      res.status(500).json({ message: "Error fetching approved events", error });
    }
  },
  GetAllEvents: async (req, res) => {
    try {
      // Verify user role
      if (!req.user || !['System Admin', 'Organizer'].includes(req.user.role)) {
        return res.status(403).json({ message: "Unauthorized: Only admins and organizers can view all events" });
      }

      // For organizers, only show their events
      if (req.user.role === 'Organizer') {
        const events = await EventModel.find({ organizer: req.user.userId });
        return res.status(200).json(events);
      }

      // For admins, show all events
      const events = await EventModel.find({});
      res.status(200).json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Error fetching events", error });
    }
  },
  GetEventById: async (req, res) => {
    try {
      const { id } = req.params;
      const event = await EventModel.findById(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.status(200).json(event);
    } catch (error) {
      res.status(500).json({ message: "Error fetching event", error });
    }
  },
  UpdateEvent: async (req, res) => {
    try {
      const { id } = req.params;
      console.log('Updating event:', id);
      console.log('Update data received:', req.body);

      const event = await EventModel.findById(id);
      
      if (!event) {
        console.log('Event not found:', id);
        return res.status(404).json({ message: "Event not found" });
      }

      console.log('Current event state:', {
        totalTickets: event.totalTickets,
        remainingTickets: event.remainingTickets
      });

      // If total tickets is being updated, set remaining tickets to the new total
      const updateData = {
        ...req.body,
        remainingTickets: req.body.totalTickets || event.totalTickets
      };

      console.log('Final update data:', updateData);

      const updatedEvent = await EventModel.findByIdAndUpdate(
        id, 
        updateData,
        { new: true }
      );

      console.log('Updated event:', updatedEvent);
      res.status(200).json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Error updating event", error: error.message });
    }
  },
  DeleteEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const deletedEvent = await EventModel.findByIdAndDelete(id);
      if (!deletedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting event", error });
    }
  },
  GetUserEvents: async (req, res) => {
    try {
      const { userId } = req.params;
      const userEvents = await EventModel.find({ organizer: userId });
      res.status(200).json(userEvents);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user events", error });
    }
  },
  GetApprovedEvents: async (req, res) => {
    try {
      const approvedEvents = await EventModel.find({ status: "approved" });
      res.status(200).json(approvedEvents);
    } catch (error) {
      console.error("Error fetching approved events:", error);
      res
          .status(500)
          .json({ message: "Error fetching approved events", error });
    }
  },

  // Get list of all events (Admin only)
  GetAllEventsAdmin: async (req, res) => {
    try {
      const allEvents = await EventModel.find(); // Fetch all events regardless of status
      res.status(200).json(allEvents);
    } catch (error) {
      console.error("Error fetching all events:", error);
      res.status(500).json({ message: "Error fetching all events", error });
    }
  },

  // Approve an event (Admin only)
  ApproveEvent: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if the user is an admin
      if (req.user.role !== "System Admin") {
        return res.status(403).json({ message: "Only admins can approve events" });
      }

      const event = await EventModel.findById(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.status === 'approved') {
        return res.status(400).json({ message: "Event is already approved" });
      }

      event.status = 'approved';
      await event.save();

      res.status(200).json({ message: "Event approved successfully", event });
    } catch (error) {
      console.error("Error approving event:", error);
      res.status(500).json({ message: "Error approving event", error: error.message });
    }
  },

  // Decline an event (Admin only)
  DeclineEvent: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if the user is an admin
      if (req.user.role !== "System Admin") {
        return res.status(403).json({ message: "Only admins can decline events" });
      }

      const event = await EventModel.findById(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.status === 'declined') {
        return res.status(400).json({ message: "Event is already declined" });
      }

      event.status = 'declined';
      await event.save();

      res.status(200).json({ message: "Event declined successfully", event });
    } catch (error) {
      console.error("Error declining event:", error);
      res.status(500).json({ message: "Error declining event", error: error.message });
    }
  },
};

export default EventController;