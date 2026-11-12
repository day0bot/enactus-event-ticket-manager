import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "../../config/axios";
import "../../stylesheets/EventDetails.css";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  CircularProgress
} from "@mui/material";

const EventDetails = () => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [organizerDetails, setOrganizerDetails] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/events/${id}?t=${Date.now()}`);
      setEvent(response.data);

      if (response.data.organizer) {
        try {
          const orgResponse = await axios.get(`/users/${response.data.organizer}`);
          setOrganizerDetails(orgResponse.data);
        } catch (orgErr) {
          console.error("Error fetching organizer details:", orgErr);
        }
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching event details:", err);
      setError(
        err.response?.data?.message ||
        "Failed to load event details. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventDetails();
  }, [id, location.search]); // Re-fetch when URL parameters change

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    const maxTickets = event?.remainingTickets || 0;
    if (value > 0 && value <= maxTickets) {
      setTicketQuantity(value);
    }
  };

  const handlePurchaseClick = () => {
    if (!user) {
      toast.error("Please login to purchase tickets");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setIsBookingModalOpen(true);
  };

  const handlePurchaseConfirm = async () => {
    if (!user) {
      toast.error("Please login to purchase tickets");
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    setIsProcessing(true);
    try {
      // First check availability
      const availabilityCheck = await axios.get(`/events/${id}`);
      const event = availabilityCheck.data;

      if (!event.remainingTickets || event.remainingTickets < ticketQuantity) {
        toast.error("Sorry, not enough tickets available.");
        setIsBookingModalOpen(false);
        return;
      }

      // Proceed with booking
      const response = await axios.post(`/bookings`, {
        eventId: id,
        numberOfTickets: ticketQuantity
      });

      if (response.data) {
        toast.success("Tickets booked successfully!");
        setIsBookingModalOpen(false);
        // Redirect to bookings page after a short delay to show the success message
        setTimeout(() => {
          navigate("/bookings");
        }, 1500);
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.message || "Failed to book tickets. Please try again.");
      if (error.response?.status === 400) {
        setIsBookingModalOpen(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "TBA";
    try {
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch {
      return "Invalid date";
    }
  };

  // Check if event is available for purchase
  const isEventAvailable = () => {
    if (!event) return false;

    const now = new Date();
    const eventDate = new Date(event.date);
    const hasRemainingTickets = (event.remainingTickets || 0) > 0;
    const isApproved = event.status === "approved" || !event.status;

    return eventDate > now && hasRemainingTickets && isApproved;
  };

  // Get event status badge text and class
  const getEventStatus = () => {
    if (!event) return { text: "Unknown", className: "status-unknown" };

    const now = new Date();
    const eventDate = new Date(event.date);

    if (event.status === "pending") {
      return { text: "Pending Approval", className: "event-pending" };
    } else if (event.status === "rejected") {
      return { text: "Rejected", className: "event-rejected" };
    } else if (eventDate < now) {
      return { text: "Event Ended", className: "event-past" };
    } else if ((event.remainingTickets || 0) === 0) {
      return { text: "Sold Out", className: "event-sold-out" };
    } else {
      return { text: "Upcoming", className: "event-upcoming" };
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner">
          <span className="visually-hidden">Loading event details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-alert">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12" y2="16"></line>
          </svg>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="btn-back">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="not-found-container">
        <h2>Event Not Found</h2>
        <p>The event you're looking for doesn't exist or has been removed.</p>
        <button onClick={() => navigate("/events")} className="btn-back">
          Browse Events
        </button>
      </div>
    );
  }

  const status = getEventStatus();

  return (
    <>
      <div className="event-details-container">
        <div
          className="event-hero"
          style={event.image ? { backgroundImage: `url(${event.image})` } : {}}
        >
          <div className="event-hero-overlay">
            <div className="event-hero-content">
              <h1 className="eventDetails-title">{event.title}</h1>
              <div className="event-badges">
                <span className="event-category">
                  {event.category || "General"}
                </span>
                <span className={status.className}>{status.text}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="event-details-content">
          <div className="event-main-info">
            <div className="event-info-card">
              <div className="event-detail-item">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <div>
                  <h3>Date & Time</h3>
                  <p>{formatDate(event.date)}</p>
                </div>
              </div>

              <div className="event-detail-item">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <div>
                  <h3>Location</h3>
                  <p>{event.location}</p>
                </div>
              </div>

              <div className="event-detail-item">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <div>
                  <h3>Organizer</h3>
                  <p>{organizerDetails?.name || "Unknown"}</p>
                </div>
              </div>

              <div className="event-detail-item">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <div>
                  <h3>Price</h3>
                  <p>${event.ticketPricing}</p>
                </div>
              </div>

              <div className="event-detail-item">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 12H4"></path>
                  <path d="M20 6H4"></path>
                  <path d="M20 18H4"></path>
                </svg>
                <div>
                  <h3>Available Tickets</h3>
                  <p>{event.remainingTickets}</p>
                </div>
              </div>

              {isEventAvailable() && (
                <div className="ticket-purchase-section">
                  <div className="quantity-selector">
                    <label htmlFor="ticketQuantity">Number of Tickets:</label>
                    <input
                      type="number"
                      id="ticketQuantity"
                      min="1"
                      max={event.remainingTickets}
                      value={ticketQuantity}
                      onChange={handleQuantityChange}
                    />
                  </div>
                  <button
                    className="btn-purchase"
                    onClick={handlePurchaseClick}
                    disabled={!isEventAvailable()}
                  >
                    Purchase Tickets
                  </button>
                </div>
              )}
            </div>

            <div className="event-description">
              <h2>About This Event</h2>
              <p>{event.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      <Dialog open={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)}>
        <DialogTitle>Confirm Your Booking</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6">{event?.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(event?.date)}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Booking Summary</Typography>
            <Typography>Quantity: {ticketQuantity} tickets</Typography>
            <Typography>Price per ticket: ${event?.ticketPricing}</Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              Total: ${(event?.ticketPricing * ticketQuantity).toFixed(2)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsBookingModalOpen(false)}>Cancel</Button>
          <Button
            onClick={handlePurchaseConfirm}
            variant="contained"
            color="primary"
            disabled={isProcessing}
          >
            {isProcessing ? <CircularProgress size={24} /> : 'Confirm Purchase'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EventDetails;
