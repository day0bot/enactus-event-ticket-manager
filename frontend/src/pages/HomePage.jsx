import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../config/axios";
import { toast } from "react-toastify";
import { exportToCsv } from "../utils/csvExport";
import { format } from "date-fns";

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [eventsRes, ticketsRes] = await Promise.all([
        axios.get("/events").catch(() => ({ data: [] })),
        axios.get("/tickets").catch(() => ({ data: [] })),
      ]);
      setEvents(eventsRes.data || []);
      setTickets(ticketsRes.data || []);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  // Export ALL tickets to CSV
  const handleExportAllTickets = () => {
    if (!tickets || tickets.length === 0) {
      toast.info("No tickets available to export");
      return;
    }

    const columns = [
      { header: "Ticket Code", key: "ticketCode" },
      { header: "Event Title", key: (t) => t.event?.title || "N/A" },
      {
        header: "Event Date",
        key: (t) => (t.event?.date ? format(new Date(t.event.date), "yyyy-MM-dd") : "N/A"),
      },
      { header: "Location", key: (t) => t.event?.location || "N/A" },
      { header: "Recipient Name", key: "recipientName" },
      { header: "Recipient Email", key: "recipientEmail" },
      { header: "Ticket Type", key: "ticketType" },
      { header: "Status", key: "status" },
      {
        header: "QR Scanner URL",
        key: (t) => `${window.location.origin}/verify/${t.ticketCode}`,
      },
      {
        header: "Issued Date",
        key: (t) => (t.createdAt ? format(new Date(t.createdAt), "yyyy-MM-dd HH:mm") : "N/A"),
      },
    ];

    const filename = `enactus_all_tickets_${format(new Date(), "yyyyMMdd_HHmm")}`;
    exportToCsv(filename, tickets, columns);
    toast.success(`Exported ${tickets.length} tickets to CSV successfully!`);
  };

  // Export tickets for a specific event
  const handleExportEventTickets = (event) => {
    const eventTickets = tickets.filter(
      (t) => t.event && (t.event._id === event._id || t.event === event._id)
    );

    if (eventTickets.length === 0) {
      toast.info(`No tickets generated yet for "${event.title}"`);
      return;
    }

    const columns = [
      { header: "Ticket Code", key: "ticketCode" },
      { header: "Event Title", key: () => event.title },
      {
        header: "Event Date",
        key: () => (event.date ? format(new Date(event.date), "yyyy-MM-dd") : "N/A"),
      },
      { header: "Location", key: () => event.location || "N/A" },
      { header: "Recipient Name", key: "recipientName" },
      { header: "Recipient Email", key: "recipientEmail" },
      { header: "Ticket Type", key: "ticketType" },
      { header: "Status", key: "status" },
      {
        header: "QR Scanner URL",
        key: (t) => `${window.location.origin}/verify/${t.ticketCode}`,
      },
      {
        header: "Issued Date",
        key: (t) => (t.createdAt ? format(new Date(t.createdAt), "yyyy-MM-dd HH:mm") : "N/A"),
      },
    ];

    const safeTitle = event.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filename = `tickets_${safeTitle}_${format(new Date(), "yyyyMMdd_HHmm")}`;
    exportToCsv(filename, eventTickets, columns);
    toast.success(`Exported ${eventTickets.length} tickets for "${event.title}" to CSV!`);
  };

  const filteredEvents = events.filter((ev) => {
    if (!filterText) return true;
    const term = filterText.toLowerCase();
    return (
      ev.title?.toLowerCase().includes(term) ||
      ev.location?.toLowerCase().includes(term) ||
      ev.category?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/40 p-8 rounded-3xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-5">
              <div className="relative">
                <img
                  src="/enactus-logo.png"
                  alt="Enactus Origami Bird Logo"
                  className="w-16 h-16 rounded-2xl object-contain border-2 border-amber-500 shadow-lg bg-neutral-950 p-1"
                />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Operations Dashboard
                  </span>
                  <span className="text-xs text-neutral-400">Atlas Live Database</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                  Enactus Event Ticket Manager
                </h1>
                <p className="text-neutral-400 text-sm sm:text-base mt-1">
                  Issue attendee tickets, oversee active events, and export records directly to CSV.
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Link
                to="/tickets?action=validate"
                className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg active:scale-95"
              >
                <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Gate Validator
              </Link>
              <Link
                to="/tickets?action=generate"
                className="flex-1 md:flex-none inline-flex items-center justify-center px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Issue Tickets
              </Link>
              <button
                onClick={handleExportAllTickets}
                className="flex-1 md:flex-none inline-flex items-center justify-center px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 font-semibold border border-amber-500/30 transition-all shadow active:scale-95"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export All (CSV)
              </button>
            </div>
          </div>
        </div>

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-neutral-900/90 p-6 rounded-2xl border border-neutral-800 hover:border-amber-500/40 transition-colors shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-sm font-medium">Total Active Events</span>
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline">
              <span className="text-3xl font-extrabold text-white">{events.length}</span>
              <span className="ml-2 text-xs text-amber-400 font-semibold">Active in Atlas</span>
            </div>
          </div>

          <div className="bg-neutral-900/90 p-6 rounded-2xl border border-neutral-800 hover:border-amber-500/40 transition-colors shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-sm font-medium">Total Tickets Issued</span>
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline">
              <span className="text-3xl font-extrabold text-white">{tickets.length}</span>
              <span className="ml-2 text-xs text-emerald-400 font-semibold">Ready for Export</span>
            </div>
          </div>

          <div className="bg-neutral-900/90 p-6 rounded-2xl border border-neutral-800 hover:border-amber-500/40 transition-colors shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-sm font-medium">Total Ticket Capacity</span>
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline">
              <span className="text-3xl font-extrabold text-white">
                {events.reduce((sum, e) => sum + (e.totalTickets || 0), 0)}
              </span>
              <span className="ml-2 text-xs text-blue-400 font-semibold">Attendees</span>
            </div>
          </div>

          <div className="bg-neutral-900/90 p-6 rounded-2xl border border-neutral-800 hover:border-amber-500/40 transition-colors shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-sm font-medium">CSV Export Status</span>
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline">
              <span className="text-xl font-bold text-amber-400">UTF-8 BOM</span>
              <span className="ml-2 text-xs text-neutral-400">Excel Compatible</span>
            </div>
          </div>
        </div>

        {/* Events & Ticketing Operations Section */}
        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                Event Operations & Ticket Issuance
              </h2>
              <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
                Generate custom tickets for any Enactus event or export attendee sheets directly.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search events by title or location..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full sm:w-64 bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <Link
                to="/tickets"
                className="inline-flex items-center px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded-xl border border-neutral-700 text-sm font-semibold transition whitespace-nowrap"
              >
                View All Tickets ({tickets.length})
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-neutral-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 mb-3"></div>
              <p>Loading Enactus dashboard data...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-neutral-400">
              <p>No events found matching your search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-300">
                <thead className="bg-neutral-950/60 text-xs uppercase text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Event Title</th>
                    <th className="px-6 py-4 font-semibold">Category</th>
                    <th className="px-6 py-4 font-semibold">Date & Location</th>
                    <th className="px-6 py-4 font-semibold">Issued / Remaining</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {filteredEvents.map((ev) => {
                    const eventTicketsCount = tickets.filter(
                      (t) => t.event && (t.event._id === ev._id || t.event === ev._id)
                    ).length;

                    return (
                      <tr key={ev._id} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white text-base">{ev.title}</div>
                          <div className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                            {ev.description}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 text-xs rounded-full bg-neutral-800 text-amber-400 border border-amber-500/20 font-medium">
                            {ev.category || "General"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-neutral-200">
                            {ev.date ? format(new Date(ev.date), "PPP") : "TBA"}
                          </div>
                          <div className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                            📍 {ev.location || "Online"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-amber-400">{eventTicketsCount}</span>
                            <span className="text-neutral-500">issued /</span>
                            <span className="text-neutral-300 font-medium">{ev.remainingTickets ?? 0}</span>
                            <span className="text-neutral-500">left</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/tickets?eventId=${ev._id}&action=generate`}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-neutral-950 font-medium text-xs border border-amber-500/30 transition-all inline-flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                              Create Tickets
                            </Link>

                            <button
                              onClick={() => handleExportEventTickets(ev)}
                              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs border border-neutral-700 transition inline-flex items-center gap-1"
                              title="Export tickets for this event into CSV"
                            >
                              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Export CSV
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Launch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Full Ticket Manager</h3>
              <p className="text-neutral-400 text-sm mt-1">
                View, filter, delete, or bulk generate tickets with unique validation codes and attendee assignments.
              </p>
            </div>
            <Link
              to="/tickets"
              className="mt-6 inline-flex items-center text-sm font-semibold text-amber-400 hover:text-amber-300"
            >
              Open Ticket Manager &rarr;
            </Link>
          </div>

          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Direct CSV Export</h3>
              <p className="text-neutral-400 text-sm mt-1">
                Download immediate UTF-8 BOM CSV spreadsheets formatted for Microsoft Excel, Google Sheets, or badging tools.
              </p>
            </div>
            <button
              onClick={handleExportAllTickets}
              className="mt-6 inline-flex items-center text-sm font-semibold text-emerald-400 hover:text-emerald-300 text-left"
            >
              Export All Tickets Now &rarr;
            </button>
          </div>

          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Create New Event</h3>
              <p className="text-neutral-400 text-sm mt-1">
                Organize upcoming Enactus workshops, conferences, or pitch competitions with custom ticket limits.
              </p>
            </div>
            <Link
              to="/my-events/new"
              className="mt-6 inline-flex items-center text-sm font-semibold text-blue-400 hover:text-blue-300"
            >
              Add New Event &rarr;
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
