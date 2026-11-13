import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";

export default function PublicTicketScan() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(Boolean(code));
  const [result, setResult] = useState(null);
  const [inputCode, setInputCode] = useState("");
  const [currentCode, setCurrentCode] = useState(code || "");

  useEffect(() => {
    if (code) {
      setCurrentCode(code);
      scanTicketCode(code);
    } else {
      setLoading(false);
    }
  }, [code]);

  const scanTicketCode = async (targetCode) => {
    if (!targetCode || !targetCode.trim()) return;
    setLoading(true);
    setResult(null);

    const cleanCode = targetCode.trim().toUpperCase();
    setCurrentCode(cleanCode);

    try {
      // Use direct fetch to public endpoint - ZERO login/credentials required
      const response = await fetch(`/api/v1/tickets/public-scan/${cleanCode}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Scanner error:", err);
      setResult({
        status: "INVALID",
        message: "Failed to connect to verification server. Check network.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (inputCode.trim()) {
      scanTicketCode(inputCode.trim());
      setInputCode("");
    }
  };

  const isSuccess = result?.status === "SUCCESS";
  const isAlreadyUsed = result?.status === "ALREADY_USED";
  const isInvalid = result && !isSuccess && !isAlreadyUsed;

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-between transition-colors duration-300 font-sans ${
        loading
          ? "bg-neutral-950 text-white"
          : isSuccess
          ? "bg-emerald-600 text-white"
          : isAlreadyUsed || isInvalid
          ? "bg-red-700 text-white"
          : "bg-neutral-950 text-white"
      }`}
    >
      {/* Top Header Bar */}
      <div className="w-full px-4 py-3 flex items-center justify-between bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center space-x-3">
          <img
            src="/enactus-logo.png"
            alt="Enactus"
            className="w-9 h-9 rounded-xl object-contain border border-amber-400/50 p-0.5 bg-black"
          />
          <div>
            <h1 className="text-sm font-extrabold uppercase tracking-wider text-white">
              Enactus Fast Gate Validator
            </h1>
            <p className="text-[10px] text-amber-300 font-bold uppercase tracking-widest">
              Live Concert Door Scanner
            </p>
          </div>
        </div>

        {currentCode && (
          <span className="font-mono text-xs font-black px-3 py-1 rounded-full bg-black/60 border border-white/20 text-white">
            {currentCode}
          </span>
        )}
      </div>

      {/* Main Validation Result Display */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-lg mx-auto w-full">
        {loading ? (
          <div className="space-y-4">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-amber-400 border-t-transparent"></div>
            <h2 className="text-2xl font-black tracking-tight text-white">CHECKING TICKET...</h2>
            <p className="text-sm text-neutral-400 font-mono">Verifying {currentCode}</p>
          </div>
        ) : isSuccess ? (
          /* GREEN SCREEN: VALID TICKET */
          <div className="w-full space-y-6 animate-fadeIn">
            {/* Giant Success Icon */}
            <div className="w-28 h-28 mx-auto rounded-full bg-white/20 border-4 border-white flex items-center justify-center shadow-2xl animate-bounce">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Giant Bold Headlines */}
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-white text-emerald-800 shadow mb-3">
                Access Granted
              </span>
              <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
                VALID TICKET
              </h2>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-100 mt-2 uppercase tracking-wide">
                ADMIT ONE
              </p>
            </div>

            {/* Attendee Details Card */}
            {result.ticket && (
              <div className="bg-black/30 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-left space-y-3 shadow-xl">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-emerald-200 font-bold">Attendee</div>
                  <div className="text-2xl font-black text-white">
                    {result.ticket.recipientName || "General Guest"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">Event</div>
                    <div className="text-sm font-extrabold text-white line-clamp-1">
                      {result.ticket.event?.title || "Enactus Event"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold">Tier</div>
                    <div className="text-sm font-extrabold text-amber-300">
                      {result.ticket.ticketType || "General Admission"}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs text-emerald-100 font-mono">
                  <span>Admitted: {format(new Date(), "h:mm:ss a")}</span>
                  <span className="font-bold text-white uppercase bg-emerald-700/80 px-2 py-0.5 rounded">Used</span>
                </div>
              </div>
            )}

            <div className="text-xs text-emerald-100 font-semibold bg-emerald-800/40 py-2 px-4 rounded-xl border border-white/10">
              🔒 One-Time Use Policy: Re-scanning this QR code is now blocked.
            </div>
          </div>
        ) : isAlreadyUsed ? (
          /* RED SCREEN: ALREADY USED */
          <div className="w-full space-y-6 animate-shake">
            {/* Giant Warning Icon */}
            <div className="w-28 h-28 mx-auto rounded-full bg-white/20 border-4 border-white flex items-center justify-center shadow-2xl animate-pulse">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            {/* Giant Bold Headlines */}
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-white text-red-700 shadow mb-3">
                Do Not Admit
              </span>
              <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
                ACCESS DENIED
              </h2>
              <p className="text-xl sm:text-2xl font-black text-red-200 mt-2 uppercase tracking-wide">
                ALREADY USED!
              </p>
            </div>

            {/* Details Card */}
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-left space-y-3 shadow-xl">
              <div className="text-sm font-bold text-red-100">
                ⚠️ Warning: This ticket was ALREADY scanned and admitted previously.
              </div>

              {result?.checkedInAt && (
                <div className="pt-2 border-t border-white/10 text-xs font-mono text-red-200">
                  First Admitted: <strong>{format(new Date(result.checkedInAt), "PPP 'at' p")}</strong>
                </div>
              )}

              {result.ticket && (
                <div className="pt-2 border-t border-white/10 text-xs text-red-200">
                  Attendee on File: <strong className="text-white text-sm">{result.ticket.recipientName}</strong>
                </div>
              )}
            </div>

            <div className="text-xs text-red-200 font-bold bg-black/40 py-2.5 px-4 rounded-xl border border-white/10">
              🛑 DUPLICATE CODE: Duplicate entry or screenshot sharing detected.
            </div>
          </div>
        ) : isInvalid ? (
          /* RED SCREEN: INVALID CODE */
          <div className="w-full space-y-6">
            <div className="w-28 h-28 mx-auto rounded-full bg-white/20 border-4 border-white flex items-center justify-center shadow-2xl">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div>
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-white text-red-700 shadow mb-3">
                Entry Rejected
              </span>
              <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
                ACCESS DENIED
              </h2>
              <p className="text-lg sm:text-xl font-extrabold text-red-200 mt-2 uppercase tracking-wide">
                INVALID TICKET
              </p>
            </div>

            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-sm font-semibold text-red-200">
              {result?.message || `Code "${currentCode}" does not exist in the Enactus database.`}
            </div>
          </div>
        ) : (
          /* STANDALONE GATE SCANNER (No code scanned yet) */
          <div className="w-full space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center">
              <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-white">Ready for Scanning</h2>
              <p className="text-sm text-neutral-400 mt-1">
                Scan attendee QR codes with phone camera or enter code below
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: Instant Code Input / Scan Next */}
      <div className="w-full p-4 bg-black/60 backdrop-blur-lg border-t border-white/10">
        <div className="max-w-lg mx-auto space-y-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Scan or type code (e.g. ENACTUS-A1B2C3)..."
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="flex-1 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-base font-mono font-bold text-white placeholder-white/50 focus:outline-none focus:border-amber-400 uppercase"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-white hover:bg-neutral-200 text-black font-extrabold rounded-xl transition shadow active:scale-95"
            >
              Verify
            </button>
          </form>

          <div className="flex justify-between items-center text-[11px] text-white/70 px-1">
            <span>🔒 ZERO Login Required</span>
            <Link to="/" className="text-amber-300 hover:text-white font-semibold">
              Operations Dashboard &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
