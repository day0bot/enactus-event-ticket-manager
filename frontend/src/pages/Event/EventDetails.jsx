import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "../../config/axios";
import "../../stylesheets/EventDetails.css";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { exportToCsv } from "../../utils/csvExport";
import { format } from "date-fns";

const EventDetails = () => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [organizerDetails, setOrganizerDetails] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleCreateTicketsClick = () => {
    navigate(`/tickets?eventId=${id}&action=generate`);
  };

  const handleExportEventTicketsCsv = async () => {
    setIsExporting(true);
    try {
      const res = await axios.get("/tickets");
      const allTickets = res.data || [];
      const eventTickets = allTickets.filter(
        (t) => t.event && (t.event._id === id || t.event === id)
      );

      if (eventTickets.length === 0) {
        toast.info("No tickets created yet for this event.");
        return;
      }

      const columns = [
        { header: "Ticket Code", key: "ticketCode" },
        { header: "Event Title", key: () => event?.title || "N/A" },
        {
          header: "Event Date",
          key: () => (event?.date ? format(new Date(event.date), "yyyy-MM-dd") : "N/A"),
        },
        { header: "Location", key: () => event?.location || "N/A" },
        { header: "Recipient Name", key: "recipientName" },
        { header: "Recipient Email", key: "recipientEmail" },
        { header: "Ticket Type", key: "ticketType" },
        { header: "Status", key: "status" },
        {
          header: "Issued Date",
          key: (t) => (t.createdAt ? format(new Date(t.createdAt), "yyyy-MM-dd HH:mm") : "N/A"),
        },
      ];

      const safeTitle = (event?.title || "event").replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const filename = `tickets_${safeTitle}_${format(new Date(), "yyyyMMdd_HHmm")}`;
      exportToCsv(filename, eventTickets, columns);
      toast.success(`Exported ${eventTickets.length} tickets to CSV successfully!`);
    } catch (err) {
      console.error("Error exporting event tickets:", err);
      toast.error("Failed to export tickets to CSV");
    } finally {
      setIsExporting(false);
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

              <div className="ticket-purchase-section flex flex-col gap-3 mt-4">
                <button
                  className="btn-purchase w-full !bg-amber-500 hover:!bg-amber-400 !text-neutral-950 !font-bold py-3 rounded-xl transition shadow flex items-center justify-center gap-2"
                  onClick={handleCreateTicketsClick}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Issue / Create Tickets
                </button>
                <button
                  className="w-full bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-semibold py-2.5 rounded-xl border border-amber-500/30 transition flex items-center justify-center gap-2 text-sm"
                  onClick={handleExportEventTicketsCsv}
                  disabled={isExporting}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {isExporting ? "Exporting..." : "Export Event Tickets (CSV)"}
                </button>
                <button
                  className="w-full bg-transparent hover:bg-neutral-800/60 text-neutral-400 font-medium py-2 rounded-xl text-xs transition"
                  onClick={() => navigate("/")}
                >
                  &larr; Back to Dashboard
                </button>
              </div>
            </div>

            <div className="event-description">
              <h2>About This Event</h2>
              <p>{event.description}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EventDetails;
