import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "../../config/axios";
import { useAuth } from "../../context/AuthContext";

const CATEGORIES = [
  "Conference",
  "Workshop",
  "Concert",
  "Exhibition",
  "Pitch Competition",
  "Summit",
  "Sport",
  "Other",
];

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80";

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date || !formData.location.trim()) {
      toast.error("Please fill in Title, Date, and Location.");
      return;
    }

    setLoading(true);
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

      await axios.post("/events", payload);
      toast.success("Event created successfully!");
      navigate("/events");
    } catch (err) {
      console.error("Error creating event:", err);
      toast.error(err.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/events"
            className="text-sm font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition"
          >
            &larr; Back to Events
          </Link>
          <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
            Enactus Operations
          </span>
        </div>

        {/* Card Form */}
        <div className="bg-neutral-900 border border-amber-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-neutral-800">
            <img
              src="/enactus-logo.png"
              alt="Enactus"
              className="w-14 h-14 rounded-2xl object-contain border border-amber-500/40 p-1 bg-black"
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Create New Event</h1>
              <p className="text-sm text-neutral-400 mt-0.5">
                Set up ticket allocation, date, and venue for your gathering
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Event Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Enactus Innovation Showcase 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-amber-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Venue / Location *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Grand Amphitheater / Campus Center"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  Ticket Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="25"
                  value={formData.ticketPricing}
                  onChange={(e) => setFormData({ ...formData, ticketPricing: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  Max Audience Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="150"
                  value={formData.totalTickets}
                  onChange={(e) => setFormData({ ...formData, totalTickets: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Banner Image URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-amber-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                rows="4"
                placeholder="Highlight speakers, musical performances, workshops, and rules..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-amber-500 text-sm"
              ></textarea>
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-end gap-3">
              <Link
                to="/events"
                className="px-6 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold transition text-sm"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition shadow-lg disabled:opacity-50 text-sm"
              >
                {loading ? "Publishing..." : "Save & Publish Event"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
