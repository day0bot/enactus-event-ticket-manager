import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "../../config/axios";
import { toast } from "react-toastify";
import { exportToCsv } from "../../utils/csvExport";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

export default function TicketManager() {
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetEventId, setTargetEventId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [ticketType, setTicketType] = useState("General Admission");
  const [isGenerating, setIsGenerating] = useState(false);

  // Concert entrance validator / scanner state
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // QR Code Pass Viewer State
  const [selectedTicketForQr, setSelectedTicketForQr] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const urlEventId = searchParams.get("eventId");
    const openAction = searchParams.get("action");
    if (urlEventId) {
      setSelectedEventId(urlEventId);
      setTargetEventId(urlEventId);
      if (openAction === "generate") {
        setIsModalOpen(true);
      }
    }
    if (openAction === "validate") {
      setIsVerifyModalOpen(true);
    }
  }, [searchParams]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, eventsRes] = await Promise.all([
        axios.get("/tickets").catch(() => ({ data: [] })),
        axios.get("/events").catch(() => ({ data: [] })),
      ]);
      setTickets(ticketsRes.data || []);
      setEvents(eventsRes.data || []);
      const urlEventId = searchParams.get("eventId");
      if (urlEventId) {
        setTargetEventId(urlEventId);
      } else if (eventsRes.data && eventsRes.data.length > 0) {
        setTargetEventId(eventsRes.data[0]._id);
      }
    } catch (err) {
      console.error("Error loading tickets or events:", err);
      toast.error("Failed to load ticket management data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTickets = async (e) => {
    e.preventDefault();
    if (!targetEventId) {
      toast.error("Please select an event");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await axios.post("/tickets/generate", {
        eventId: targetEventId,
        quantity: parseInt(quantity, 10) || 1,
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim(),
        ticketType,
      });

      toast.success(res.data?.message || "Tickets created successfully!");
      setIsModalOpen(false);
      setQuantity(1);
      setRecipientName("");
      setRecipientEmail("");

      // Refresh tickets
      const refreshedTickets = await axios.get("/tickets");
      setTickets(refreshedTickets.data || []);
    } catch (err) {
      console.error("Error generating tickets:", err);
      toast.error(err.response?.data?.message || "Failed to generate tickets");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    try {
      await axios.delete(`/tickets/${ticketId}`);
      toast.success("Ticket deleted successfully");
      setTickets((prev) => prev.filter((t) => t._id !== ticketId));
    } catch (err) {
      console.error("Error deleting ticket:", err);
      toast.error("Failed to delete ticket");
    }
  };

  // Verify ticket code at the entrance
  const handleVerifyTicket = async (e, forceCheckIn = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!verifyCode.trim()) {
      toast.error("Please enter a ticket code");
      return;
    }

    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const res = await axios.post("/tickets/verify", {
        ticketCode: verifyCode.trim(),
        checkIn: forceCheckIn,
      });

      setVerifyResult(res.data);
      if (res.data?.valid) {
        if (forceCheckIn) {
          toast.success("Ticket verified & checked in!");
          setTickets((prev) =>
            prev.map((t) =>
              t.ticketCode === res.data.ticket?.ticketCode
                ? { ...t, status: "Used" }
                : t
            )
          );
        } else {
          toast.success("Ticket is Valid!");
        }
      } else {
        toast.warning(res.data?.message || "Invalid ticket");
      }
    } catch (err) {
      console.error("Verification error:", err);
      const errMsg = err.response?.data?.message || "Ticket verification failed";
      setVerifyResult({
        valid: false,
        status: "NotFound",
        message: errMsg,
      });
      toast.error(errMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const matchesEvent =
      selectedEventId === "all" ||
      (ticket.event && (ticket.event._id === selectedEventId || ticket.event === selectedEventId));
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      ticket.ticketCode?.toLowerCase().includes(term) ||
      ticket.recipientName?.toLowerCase().includes(term) ||
      ticket.recipientEmail?.toLowerCase().includes(term) ||
      ticket.event?.title?.toLowerCase().includes(term);
    return matchesEvent && matchesSearch;
  });

  // Export to CSV
  const handleExportCsv = () => {
    if (!filteredTickets || filteredTickets.length === 0) {
      toast.info("No tickets to export");
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

    const filename = `enactus_tickets_export_${format(new Date(), "yyyyMMdd_HHmm")}`;
    exportToCsv(filename, filteredTickets, columns);
    toast.success(`Exported ${filteredTickets.length} tickets to CSV successfully!`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-950 p-6 rounded-2xl border border-amber-500/20 shadow-xl">
          <div className="flex items-center space-x-4">
            <img
              src="/enactus-logo.png"
              alt="Enactus Logo"
              className="w-12 h-12 rounded-xl object-contain border border-amber-500/40 shadow"
            />
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Ticket Generator & Management Dashboard
              </h1>
              <p className="text-sm text-slate-400">
                Issue branded Enactus tickets and export batches instantly into CSV
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setVerifyResult(null);
                setVerifyCode("");
                setIsVerifyModalOpen(true);
              }}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Concert Gate Validator
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl shadow-lg transition-all"
            >
              + Create Tickets
            </button>
            <button
              onClick={handleExportCsv}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-amber-500/40 font-semibold rounded-xl shadow transition-all"
            >
              📥 Export to CSV
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-2xl shadow-md">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Tickets Issued</p>
            <p className="text-3xl font-black text-amber-400 mt-1">{tickets.length}</p>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-2xl shadow-md">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Active Events</p>
            <p className="text-3xl font-black text-white mt-1">{events.length}</p>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-2xl shadow-md">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Filtered Export Ready</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">{filteredTickets.length}</p>
          </div>
        </div>

        {/* Controls: Search and Event Filter */}
        <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="w-full md:w-1/2">
            <input
              type="text"
              placeholder="Search by Ticket Code, Recipient, or Event..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="w-full md:w-1/3 flex items-center gap-3">
            <label className="text-sm font-medium text-slate-400 whitespace-nowrap">Filter Event:</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Events ({tickets.length})</option>
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-neutral-950 rounded-2xl border border-neutral-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-900/80 border-b border-amber-500/20 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Ticket Code</th>
                  <th className="py-4 px-6">Event</th>
                  <th className="py-4 px-6">Recipient</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Issued Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      Loading ticket records...
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No tickets found. Click <span className="text-amber-400 font-semibold">"+ Create Tickets"</span> to issue your first batch.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket._id} className="hover:bg-neutral-900/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-amber-400">
                        {ticket.ticketCode}
                      </td>
                      <td className="py-4 px-6 font-medium text-white">
                        {ticket.event?.title || "N/A"}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-200">{ticket.recipientName || "Guest"}</div>
                        {ticket.recipientEmail && (
                          <div className="text-xs text-slate-400">{ticket.recipientEmail}</div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-800 border border-neutral-700 text-slate-300">
                          {ticket.ticketType}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          ticket.status === "Used"
                            ? "bg-amber-950/80 border border-amber-500/50 text-amber-400"
                            : ticket.status === "Cancelled"
                            ? "bg-rose-950 border border-rose-500/40 text-rose-400"
                            : "bg-emerald-950 border border-emerald-500/40 text-emerald-400"
                        }`}>
                          {ticket.status === "Used" ? "Used (Admitted)" : ticket.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d, yyyy") : "N/A"}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedTicketForQr(ticket)}
                            className="bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-500/30 transition-colors inline-flex items-center gap-1"
                            title="View scannable QR Code pass"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            QR Pass
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(ticket._id)}
                            className="text-rose-400 hover:text-rose-300 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-rose-950/40 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Tickets Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-neutral-950 border border-neutral-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-1">Create & Issue Tickets</h2>
            <p className="text-sm text-slate-400 mb-6">
              Generate unique tickets for an Enactus event. You can export them to CSV immediately after.
            </p>

            <form onSubmit={handleGenerateTickets} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Select Event *
                </label>
                <select
                  value={targetEventId}
                  onChange={(e) => setTargetEventId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  required
                >
                  {events.map((ev) => (
                    <option key={ev._id} value={ev._id}>
                      {ev.title} (Available: {ev.remainingTickets ?? "N/A"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Number of Tickets *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Ticket Type
                  </label>
                  <select
                    value={ticketType}
                    onChange={(e) => setTicketType(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="General Admission">General Admission</option>
                    <option value="VIP">VIP</option>
                    <option value="Delegate">Delegate</option>
                    <option value="Speaker">Speaker</option>
                    <option value="Team Member">Team Member</option>
                  </select>
                </div>
              </div>

              {parseInt(quantity, 10) === 1 && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Recipient / Assignee Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Recipient Email (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. john@enactus.org"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-slate-300 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isGenerating ? "Generating..." : "Generate Tickets"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gate Validator Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border border-emerald-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Concert Gate Validator</h3>
                  <p className="text-xs text-neutral-400">Scan or enter ticket code to verify & admit attendees</p>
                </div>
              </div>
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleVerifyTicket(e, false)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Ticket Code / Barcode (e.g. ENACTUS-A1B2C3)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Enter or scan code..."
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-lg font-mono font-bold text-amber-400 tracking-wider focus:outline-none focus:border-emerald-500 uppercase"
                  />
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="px-5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl border border-neutral-700 transition"
                  >
                    {isVerifying ? "Checking..." : "Verify"}
                  </button>
                </div>
              </div>

              {/* Live Verification Result Box */}
              {verifyResult && (
                <div
                  className={`p-4 rounded-xl border mt-4 ${
                    verifyResult.valid
                      ? verifyResult.status === "Used"
                        ? "bg-amber-950/30 border-amber-500/50 text-amber-200"
                        : "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                      : "bg-rose-950/40 border-rose-500/50 text-rose-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {verifyResult.valid
                        ? verifyResult.status === "Used"
                          ? "⚠️"
                          : "✅"
                        : "❌"}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-bold text-base">{verifyResult.message}</h4>
                      {verifyResult.ticket && (
                        <div className="mt-2 text-xs space-y-1 text-neutral-300">
                          <div>
                            <span className="text-neutral-500">Event:</span>{" "}
                            <span className="font-semibold text-white">
                              {verifyResult.ticket.event?.title || "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500">Attendee:</span>{" "}
                            <span className="font-semibold text-white">
                              {verifyResult.ticket.recipientName || "General Guest"}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500">Tier:</span>{" "}
                            <span className="font-semibold text-amber-400">
                              {verifyResult.ticket.ticketType || "General"}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500">Current Status:</span>{" "}
                            <span
                              className={`font-bold uppercase ${
                                verifyResult.ticket.status === "Valid"
                                  ? "text-emerald-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {verifyResult.ticket.status}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {verifyResult.valid && verifyResult.ticket?.status === "Valid" && (
                    <div className="mt-4 pt-3 border-t border-emerald-500/30 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => handleVerifyTicket(e, true)}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl transition shadow flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Admit Attendee & Check-In (Mark Used)
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-slate-300 font-semibold rounded-xl transition"
                >
                  Close Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Pass Viewer & Print Modal */}
      {selectedTicketForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-neutral-950 border-2 border-amber-500/50 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center">
            <button
              onClick={() => setSelectedTicketForQr(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold p-1"
            >
              ✕
            </button>

            {/* Ticket Header */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <img
                src="/enactus-logo.png"
                alt="Enactus"
                className="w-10 h-10 rounded-xl object-contain border border-amber-500/40 p-1 bg-black"
              />
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Enactus Official Pass</div>
                <div className="text-sm font-extrabold text-white">Concert Admission</div>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mb-4">
              <QRCodeSVG
                value={`${window.location.origin}/verify/${selectedTicketForQr.ticketCode}`}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Ticket Information */}
            <div className="space-y-2 mb-5">
              <div className="font-mono text-xl font-black text-amber-400 tracking-wider">
                {selectedTicketForQr.ticketCode}
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-left space-y-1">
                <div className="text-xs text-neutral-400">
                  Event: <strong className="text-white">{selectedTicketForQr.event?.title || "Enactus Event"}</strong>
                </div>
                <div className="text-xs text-neutral-400">
                  Attendee: <strong className="text-amber-300">{selectedTicketForQr.recipientName || "Guest"}</strong>
                </div>
                <div className="text-xs text-neutral-400">
                  Tier: <strong className="text-white">{selectedTicketForQr.ticketType}</strong>
                </div>
                <div className="text-xs text-neutral-400">
                  Status: <strong className={selectedTicketForQr.status === "Used" ? "text-amber-400" : "text-emerald-400"}>
                    {selectedTicketForQr.status}
                  </strong>
                </div>
              </div>

              <p className="text-[11px] text-neutral-400 leading-tight">
                Scan with any phone camera or Play Store QR scanner app to admit attendee.
                <br />
                <span className="text-amber-400 font-semibold">One-time use: Re-scanning is permanently blocked!</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition shadow"
              >
                🖨️ Print Pass
              </button>
              <button
                onClick={() => setSelectedTicketForQr(null)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-xs transition border border-neutral-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
