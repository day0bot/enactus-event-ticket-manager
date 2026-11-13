import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { Html5Qrcode } from "html5-qrcode";

export default function PublicTicketScan() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(Boolean(code));
  const [result, setResult] = useState(null);
  const [inputCode, setInputCode] = useState("");
  const [currentCode, setCurrentCode] = useState(code || "");
  const [isCameraActive, setIsCameraActive] = useState(!code); // default active if no code in URL
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef(null);

  useEffect(() => {
    if (code) {
      setCurrentCode(code);
      setIsCameraActive(false);
      scanTicketCode(code);
    } else {
      setLoading(false);
      setIsCameraActive(true);
    }
  }, [code]);

  // Clean and extract ticket code from URL or text
  const extractCode = (rawText) => {
    if (!rawText) return "";
    const urlParts = rawText.split("/verify/");
    if (urlParts.length > 1) {
      return urlParts[1].split("?")[0].split("/")[0].trim().toUpperCase();
    }
    const match = rawText.match(/ENACTUS-[A-Z0-9]+/i);
    if (match) return match[0].toUpperCase();
    return rawText.trim().toUpperCase();
  };

  const scanTicketCode = async (targetCode) => {
    const cleanCode = extractCode(targetCode);
    if (!cleanCode) return;

    setLoading(true);
    setResult(null);
    setCurrentCode(cleanCode);

    try {
      const response = await fetch(`/api/v1/tickets/public-scan/${cleanCode}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();
      setResult(data);

      // Audio & Vibration Feedback
      if (data.status === "SUCCESS") {
        if (navigator.vibrate) navigator.vibrate([200]);
      } else {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
      }
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

  // Start live HTML5 camera scanner
  useEffect(() => {
    let html5QrCode = null;

    if (isCameraActive && !result && !loading) {
      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      try {
        html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        html5QrCode
          .start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              // Successfully decoded QR code from camera
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode
                  .stop()
                  .then(() => {
                    html5QrCode.clear();
                    setIsCameraActive(false);
                    scanTicketCode(decodedText);
                  })
                  .catch(() => {
                    setIsCameraActive(false);
                    scanTicketCode(decodedText);
                  });
              } else {
                setIsCameraActive(false);
                scanTicketCode(decodedText);
              }
            },
            () => {
              // Frame decoding failure (normal during video stream)
            }
          )
          .catch((err) => {
            console.warn("Camera init failed:", err);
            setCameraError(
              "Camera access denied or unavailable. Make sure your browser has camera permission."
            );
          });
      } catch (e) {
        console.error("Camera setup exception:", e);
      }
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {}).then(() => {
          html5QrCode.clear();
        });
      }
    };
  }, [isCameraActive, result, loading]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (inputCode.trim()) {
      setIsCameraActive(false);
      scanTicketCode(inputCode.trim());
      setInputCode("");
    }
  };

  const handleScanNext = () => {
    setResult(null);
    setCurrentCode("");
    setIsCameraActive(true);
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
              Enactus Gate Camera Validator
            </h1>
            <p className="text-[10px] text-amber-300 font-bold uppercase tracking-widest">
              Live Phone Camera Scanner
            </p>
          </div>
        </div>

        {currentCode && (
          <span className="font-mono text-xs font-black px-3 py-1 rounded-full bg-black/60 border border-white/20 text-white">
            {currentCode}
          </span>
        )}
      </div>

      {/* Main Center Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-lg mx-auto w-full">
        {loading ? (
          <div className="space-y-4">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-amber-400 border-t-transparent"></div>
            <h2 className="text-2xl font-black tracking-tight text-white">CHECKING TICKET...</h2>
            <p className="text-sm text-neutral-400 font-mono">Verifying {currentCode}</p>
          </div>
        ) : isSuccess ? (
          /* GREEN SCREEN: VALID TICKET */
          <div className="w-full space-y-5 animate-fadeIn">
            {/* Giant Success Icon */}
            <div className="w-24 h-24 mx-auto rounded-full bg-white/20 border-4 border-white flex items-center justify-center shadow-2xl animate-bounce">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Giant Bold Headlines */}
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-white text-emerald-800 shadow mb-2">
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

            {/* Giant Scan Next Button */}
            <button
              onClick={handleScanNext}
              className="w-full py-4 bg-white hover:bg-neutral-100 text-emerald-800 font-black text-lg rounded-2xl shadow-2xl transition active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              📷 SCAN NEXT TICKET
            </button>
          </div>
        ) : isAlreadyUsed ? (
          /* RED SCREEN: ALREADY USED */
          <div className="w-full space-y-5 animate-shake">
            <div className="w-24 h-24 mx-auto rounded-full bg-white/20 border-4 border-white flex items-center justify-center shadow-2xl animate-pulse">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <div>
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-white text-red-700 shadow mb-2">
                Do Not Admit
              </span>
              <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
                ACCESS DENIED
              </h2>
              <p className="text-xl sm:text-2xl font-black text-red-200 mt-2 uppercase tracking-wide">
                ALREADY USED!
              </p>
            </div>

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

            <button
              onClick={handleScanNext}
              className="w-full py-4 bg-white hover:bg-neutral-100 text-red-700 font-black text-lg rounded-2xl shadow-2xl transition active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              📷 SCAN NEXT TICKET
            </button>
          </div>
        ) : isInvalid ? (
          /* RED SCREEN: INVALID CODE */
          <div className="w-full space-y-5">
            <div className="w-24 h-24 mx-auto rounded-full bg-white/20 border-4 border-white flex items-center justify-center shadow-2xl">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div>
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-white text-red-700 shadow mb-2">
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

            <button
              onClick={handleScanNext}
              className="w-full py-4 bg-white hover:bg-neutral-100 text-red-700 font-black text-lg rounded-2xl shadow-2xl transition active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              📷 SCAN NEXT TICKET
            </button>
          </div>
        ) : (
          /* LIVE IN-BROWSER CAMERA SCANNER VIEW */
          <div className="w-full space-y-4">
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mb-2">
                Live Camera Active
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">Point Camera at Ticket QR</h2>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs">
                Hold phone steady over the attendee's QR code. It verifies automatically!
              </p>
            </div>

            {/* Camera Viewfinder Box */}
            <div className="relative w-full max-w-xs mx-auto rounded-3xl overflow-hidden border-2 border-amber-500/50 shadow-2xl bg-neutral-900 aspect-square flex items-center justify-center">
              <div id="qr-reader" className="w-full h-full"></div>
              
              {/* Corner targeting guides */}
              <div className="absolute inset-4 pointer-events-none border-2 border-dashed border-amber-400/40 rounded-2xl flex items-center justify-center">
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse shadow-lg"></div>
              </div>
            </div>

            {cameraError && (
              <div className="bg-red-950/60 border border-red-500/50 text-red-200 text-xs p-3 rounded-xl max-w-xs mx-auto">
                {cameraError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar: Manual Code Input & Shortcuts */}
      <div className="w-full p-4 bg-black/60 backdrop-blur-lg border-t border-white/10">
        <div className="max-w-lg mx-auto space-y-3">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Or type code (e.g. ENACTUS-A1B2C3)..."
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="flex-1 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-base font-mono font-bold text-white placeholder-white/50 focus:outline-none focus:border-amber-400 uppercase"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-xl transition shadow active:scale-95"
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
