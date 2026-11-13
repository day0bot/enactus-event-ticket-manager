import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { publicAxios } from "../../config/axios";
import { format } from "date-fns";

export default function PublicTicketScan() {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (code) {
      scanTicket(code);
    }
  }, [code]);

  const scanTicket = async (ticketCode) => {
    setLoading(true);
    try {
      const response = await publicAxios.get(`/tickets/public-scan/${ticketCode.trim().toUpperCase()}`);
      setResult(response.data);
    } catch (err) {
      console.error("Scan error:", err);
      if (err.response?.data) {
        setResult(err.response.data);
      } else {
        setResult({
          status: "INVALID",
          message: "Could not connect to ticketing verification server.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = result?.status === "SUCCESS";
  const isAlreadyUsed = result?.status === "ALREADY_USED";
  const isInvalid = !isSuccess && !isAlreadyUsed;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
      {/* Top Brand Bar */}
      <div className="w-full max-w-md mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src="/enactus-logo.png"
            alt="Enactus"
            className="w-10 h-10 rounded-xl object-contain border border-amber-500/40 p-1 bg-black"
          />
          <div>
            <h2 className="text-base font-bold text-white tracking-tight leading-none">
              Enactus Gate Scanner
            </h2>
            <p className="text-xs text-amber-400 font-semibold mt-0.5">Live Entrance Verification</p>
          </div>
        </div>
        <span className="text-xs font-mono bg-neutral-900 border border-neutral-800 text-neutral-400 px-2.5 py-1 rounded-full">
          {code?.toUpperCase()}
        </span>
      </div>

      <div className="w-full max-w-md mx-auto">
        {loading ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center shadow-2xl space-y-4">
            <div className="inline-block animate-spin rounded-full h-14 w-14 border-4 border-amber-500 border-t-transparent"></div>
            <h3 className="text-xl font-bold text-white">Verifying Ticket...</h3>
            <p className="text-sm text-neutral-400 font-mono">Checking {code} against live database</p>
          </div>
        ) : (
          <div
            className={`rounded-3xl p-8 text-center shadow-2xl border-2 transition-all duration-300 ${
              isSuccess
                ? "bg-gradient-to-b from-emerald-950/80 to-neutral-950 border-emerald-500 shadow-emerald-500/20"
                : isAlreadyUsed
                ? "bg-gradient-to-b from-rose-950/90 to-neutral-950 border-rose-500 shadow-rose-500/30"
                : "bg-gradient-to-b from-neutral-900 to-neutral-950 border-neutral-700 shadow-xl"
            }`}
          >
            {/* Status Icon */}
            <div className="flex justify-center mb-5">
              {isSuccess && (
                <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center animate-bounce">
                  <svg className="w-14 h-14 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {isAlreadyUsed && (
                <div className="w-24 h-24 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center animate-pulse">
                  <svg className="w-14 h-14 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}

              {isInvalid && (
                <div className="w-24 h-24 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center">
                  <svg className="w-14 h-14 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Headline Banner */}
            <div className="mb-6">
              {isSuccess && (
                <>
                  <span className="inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500 text-neutral-950 mb-2">
                    Admit One
                  </span>
                  <h1 className="text-3xl font-black text-emerald-400 tracking-tight">
                    VALID TICKET
                  </h1>
                  <p className="text-sm text-emerald-200/80 mt-1">
                    First-time scan successful. Attendee admitted!
                  </p>
                </>
              )}

              {isAlreadyUsed && (
                <>
                  <span className="inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-rose-600 text-white mb-2">
                    Entry Denied
                  </span>
                  <h1 className="text-3xl font-black text-rose-500 tracking-tight">
                    ALREADY USED!
                  </h1>
                  <p className="text-sm text-rose-300 font-semibold mt-1">
                    This ticket was already scanned. Duplicate use is blocked.
                  </p>
                </>
              )}

              {isInvalid && (
                <>
                  <span className="inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-neutral-700 text-neutral-200 mb-2">
                    Access Denied
                  </span>
                  <h1 className="text-2xl font-black text-neutral-300 tracking-tight">
                    INVALID TICKET
                  </h1>
                  <p className="text-sm text-neutral-400 mt-1">
                    {result?.message || "Ticket code not recognized."}
                  </p>
                </>
              )}
            </div>

            {/* Ticket Details Box */}
            {result?.ticket && (
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 text-left space-y-3 mb-6">
                <div className="border-b border-neutral-800 pb-2">
                  <div className="text-xs uppercase text-neutral-500 font-semibold">Event</div>
                  <div className="text-base font-bold text-white leading-tight">
                    {result.ticket.event?.title || "N/A"}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    📍 {result.ticket.event?.location || "Venue"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b border-neutral-800 pb-2">
                  <div>
                    <div className="text-xs uppercase text-neutral-500 font-semibold">Attendee</div>
                    <div className="text-sm font-bold text-amber-400">
                      {result.ticket.recipientName || "General Guest"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-neutral-500 font-semibold">Tier</div>
                    <div className="text-sm font-semibold text-white">
                      {result.ticket.ticketType || "General Admission"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase text-neutral-500 font-semibold">
                    {isAlreadyUsed ? "Previously Used At" : "Admitted Timestamp"}
                  </div>
                  <div className="text-xs font-mono text-neutral-300">
                    {result.checkedInAt
                      ? format(new Date(result.checkedInAt), "PPP 'at' p")
                      : format(new Date(), "PPP 'at' p")}
                  </div>
                </div>
              </div>
            )}

            {/* One-Time Notice */}
            <div className="text-xs text-neutral-400 border-t border-neutral-800/80 pt-4">
              🔒 <strong>Enactus One-Time Policy</strong>: This ticket is now permanently invalidated and cannot be re-scanned.
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <Link
                to="/"
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl border border-neutral-800 transition text-center"
              >
                Go to Operations Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
