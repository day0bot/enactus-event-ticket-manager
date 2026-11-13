import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios, { publicAxios } from "../../config/axios";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { exportToCsv } from "../../utils/csvExport";

const CATEGORIES = [
  "Conference",
  "Workshop",
  "Concert",
  "Exhibition",
  "Pitch Competition",
  "Summit",
  "Sport",
  "Other"
];

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80";

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const navigate = useNavigate();

  // Create Event Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    category: "Conference",
    ticketPricing: 25,
    totalTickets: 100,
    image: "",
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await publicAxios.get("/events");
      setEvents(res.data || []);
    } catch (err) {
      console.error("Error fetching events:", err);
      toast.error(err.response?.data?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  // Add / Create New Event
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date || !formData.location.trim()) {
      toast.error("Please fill in all required fields (Title, Date, Location)");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formData.date,
        location: formData.location.trim(),
        category: formData.category,
        ticketPricing: Number(formData.ticketPricing) || 0,
        totalTickets: Number(formData.totalTickets) || 100,
        image: formData.image.trim() || DEFAULT_IMAGE,
      };

      const res = await axios.post("/events", payload);
      toast.success("Event created successfully!");
      setIsCreateModalOpen(false);

      // Reset form
      setFormData({
        title: "",
        description: "",
        date: "",
        location: "",
        category: "Conference",
        ticketPricing: 25,
        totalTickets: 100,
        image: "",
      });

      // Refresh event list
      fetchEvents();
    } catch (err) {
      console.error("Error creating event:", err);
      toast.error(err.response?.data?.message || "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove / Delete Event
  const handleDeleteEvent = async (eventId, eventTitle) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${eventTitle}"?`)) {
      return;
    }

    try {
      await axios.delete(`/events/${eventId}`);
      toast.success("Event deleted successfully");
      setEvents((prev) => prev.filter((e) => e._id !== eventId));
    } catch (err) {
      console.error("Error deleting event:", err);
      toast.error(err.response?.data?.message || "Failed to delete event");
    }
  };

  // Export Events Roster to CSV
  const handleExportEventsCsv = () => {
    if (!filteredEvents || filteredEvents.length === 0) {
      toast.info("No events to export");
      return;
    }

    const columns = [
      { header: "Event Title", key: "title" },
      { header: "Category", key: "category" },
      {
        header: "Date",
        key: (e) => (e.date ? format(new Date(e.date), "yyyy-MM-dd HH:mm") : "N/A"),
      },
      { header: "Location", key: "location" },
      { header: "Price ($)", key: "ticketPricing" },
      { header: "Total Capacity", key: "totalTickets" },
      { header: "Remaining Tickets", key: "remainingTickets" },
      { header: "Status", key: "status" },
      { header: "Description", key: "description" },
    ];

    const filename = `enactus_events_${format(new Date(), "yyyyMMdd_HHmm")}`;
    exportToCsv(filename, filteredEvents, columns);
    toast.success(`Exported ${filteredEvents.length} events to CSV!`);
  };

  // Filter events
  const filteredEvents = events.filter((ev) => {
    const matchesCategory =
      categoryFilter === "all" || ev.category?.toLowerCase() === categoryFilter.toLowerCase();
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      ev.title?.toLowerCase().includes(term) ||
      ev.location?.toLowerCase().includes(term) ||
      ev.description?.toLowerCase().includes(term);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/40 p-8 rounded-3xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-5">
              <img
                src="/enactus-logo.png"
                alt="Enactus Logo"
                className="w-16 h-16 rounded-2xl object-contain border-2 border-amber-500 shadow bg-neutral-950 p-1"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Event Manager
                  </span>
                  <span className="text-xs text-neutral-400">Enactus Live Database</span>
                </div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
                  Enactus Events & Concerts
                </h1>
                <p className="text-neutral-400 text-sm mt-0.5">
                  Add new events, remove past events, and manage ticket distribution across venues.
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex-1 md:flex-none inline-flex items-center justify-center px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                + Add New Event
              </button>
              <button
                onClick={handleExportEventsCsv}
                className="flex-1 md:flex-none inline-flex items-center justify-center px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-semibold border border-amber-500/30 transition shadow active:scale-95"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Events (CSV)
              </button>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-md">
            <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Active Events</span>
            <p className="text-3xl font-black text-amber-400 mt-1">{events.length}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-md">
            <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Total Audience Capacity</span>
            <p className="text-3xl font-black text-emerald-400 mt-1">
              {events.reduce((sum, ev) => sum + (ev.totalTickets || 0), 0)}
            </p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-md">
            <span className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">Remaining Tickets Left</span>
            <p className="text-3xl font-black text-blue-400 mt-1">
              {events.reduce((sum, ev) => sum + (ev.remainingTickets ?? ev.totalTickets ?? 0), 0)}
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search by title, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                categoryFilter === "all"
                  ? "bg-amber-500 text-neutral-950"
                  : "bg-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  categoryFilter === cat
                    ? "bg-amber-500 text-neutral-950"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-20 text-neutral-400">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500 mb-3"></div>
            <p>Loading Enactus events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-16 text-center text-neutral-400">
            <p className="text-lg">No events found matching your search.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 px-5 py-2.5 bg-amber-500 text-neutral-950 font-bold rounded-xl text-sm"
            >
              + Create Your First Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((ev) => (
              <div
                key={ev._id}
                className="bg-neutral-900 rounded-3xl border border-neutral-800 hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl group"
              >
                <div>
                  {/* Card Image Banner */}
                  <div className="h-48 w-full relative overflow-hidden bg-neutral-950">
                    <img
                      src={ev.image || DEFAULT_IMAGE}
                      alt={ev.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent"></div>
                    
                    {/* Category Chip */}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/80 backdrop-blur-md text-amber-400 border border-amber-500/30">
                        {ev.category || "Event"}
                      </span>
                    </div>

                    {/* Price Tag */}
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500 text-neutral-950 shadow">
                        ${ev.ticketPricing}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 space-y-3">
                    <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                      {ev.title}
                    </h3>
                    
                    <p className="text-neutral-400 text-xs line-clamp-2 leading-relaxed">
                      {ev.description || "Official Enactus event and gathering."}
                    </p>

                    <div className="pt-2 border-t border-neutral-800/80 space-y-1.5 text-xs text-neutral-300">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400">📅</span>
                        <span>{ev.date ? format(new Date(ev.date), "PPP") : "TBA"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400">📍</span>
                        <span className="line-clamp-1">{ev.location || "Venue TBA"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400">🎫</span>
                        <span>
                          <strong className="text-emerald-400">{ev.remainingTickets ?? ev.totalTickets}</strong> tickets remaining / {ev.totalTickets} total
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-6 pt-0 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/tickets?eventId=${ev._id}&action=generate`)}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition shadow flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Issue Tickets
                    </button>

                    <button
                      onClick={() => navigate(`/events/${ev._id}`)}
                      className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition"
                      title="View Details"
                    >
                      Details
                    </button>
                  </div>

                  {/* Remove Event Button */}
                  <button
                    onClick={() => handleDeleteEvent(ev._id, ev.title)}
                    className="w-full py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 text-xs font-semibold border border-rose-900/40 transition flex items-center justify-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove Event
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Add Event Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-neutral-950 border border-amber-500/40 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
              <div>
                <h2 className="text-2xl font-extrabold text-white">Create New Event</h2>
                <p className="text-xs text-neutral-400 mt-0.5">Add an upcoming Enactus concert, conference, or workshop</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enactus National Exposition 2026"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                    Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Venue / Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Auditorium / Convention Hall"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                    Ticket Price ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="25"
                    value={formData.ticketPricing}
                    onChange={(e) => setFormData({ ...formData, ticketPricing: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                    Total Audience Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="200"
                    value={formData.totalTickets}
                    onChange={(e) => setFormData({ ...formData, totalTickets: e.target.value })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Brief overview of event agenda, speakers, or musical acts..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500 text-sm"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl transition disabled:opacity-50 shadow"
                >
                  {isSubmitting ? "Creating..." : "Save & Publish Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
