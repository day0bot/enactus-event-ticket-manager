import React, { useState, useRef, useEffect, useCallback } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { toast } from "react-toastify";

/* ── Placeholder type definitions ────────────────────────────── */
const PH_TYPES = [
  { type: "attendee_name", label: "Attendee Name", icon: "👤", color: "#14b8a6", img: false, sample: "John Doe" },
  { type: "ticket_code",   label: "Ticket Code",   icon: "🔑", color: "#f59e0b", img: false, sample: "ENACTUS-A1B2C3" },
  { type: "event_title",   label: "Event Title",   icon: "🎪", color: "#8b5cf6", img: false, sample: "Enactus Summit" },
  { type: "event_date",    label: "Date",           icon: "📅", color: "#3b82f6", img: false, sample: "Nov 25, 2026" },
  { type: "event_location",label: "Venue",          icon: "📍", color: "#ec4899", img: false, sample: "Grand Theater" },
  { type: "ticket_type",   label: "Tier",           icon: "🏷️", color: "#6366f1", img: false, sample: "VIP" },
  { type: "qr_code",       label: "QR Code",        icon: "📱", color: "#10b981", img: true },
  { type: "barcode",       label: "Barcode",        icon: "📊", color: "#f97316", img: true },
];

const TXT_COLORS = ["#ffffff", "#000000", "#f59e0b", "#14b8a6", "#ef4444", "#3b82f6"];

/* ── Transparent Barcode & QR Code Generators (Background Removed) ─ */

/**
 * Generate 100% background-removed transparent PNG barcode
 */
function barcodeDataURL(text, color = "#000000") {
  try {
    const c = document.createElement("canvas");
    JsBarcode(c, text, {
      format: "CODE128",
      width: 2.6,
      height: 80,
      displayValue: false,
      margin: 0, // Zero margin
      background: "transparent", // 100% transparent PNG
      lineColor: color,
    });
    return c.toDataURL("image/png");
  } catch (err) {
    console.error("Barcode generation error:", err);
    return "";
  }
}

/**
 * Generate 100% background-removed transparent PNG QR code
 */
async function qrDataURL(text, size = 450, color = "#000000") {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 0, // Zero margin / no white quiet-zone box
      color: {
        dark: color,
        light: "#00000000", // 100% transparent background (RGBA 0 alpha)
      },
    });
  } catch (err) {
    console.error("QR generation error:", err);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  }
}

function ticketValue(t, type) {
  switch (type) {
    case "attendee_name":  return t.recipientName || "Guest";
    case "ticket_code":    return t.ticketCode || "";
    case "event_title":    return t.event?.title || "Enactus Event";
    case "event_date":     return t.event?.date ? new Date(t.event.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "TBA";
    case "event_location": return t.event?.location || "TBA";
    case "ticket_type":    return t.ticketType || "General Admission";
    default: return "";
  }
}

function escHTML(s) {
  if (!s) return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

/**
 * Computes the PERFECT RATIO grid for tickets on standard A4 paper (210 x 297 mm)
 * Supports high-density packing (e.g., 50 tickets/sheet to fit 300 tickets in 6 pages).
 * Preserves the exact, natural aspect ratio of the uploaded ticket design without any distortion.
 */
function computeA4Layout(
  tw,
  th,
  choice = "50",
  totalTickets = 300,
  customCols = 4,
  customRows = 13,
  orientChoice = "auto"
) {
  const aspect = tw / th; // original natural width / height ratio
  const M = 4; // 4mm page margin for high density
  const G = 1.2; // 1.2mm cutting gap between tickets

  const pages = [
    { pageW: 210, pageH: 297, orient: "portrait" },
    { pageW: 297, pageH: 210, orient: "landscape" },
  ];

  function getLayoutForGrid(c, r, p) {
    const usableW = p.pageW - 2 * M;
    const usableH = p.pageH - 2 * M;
    const slotW = (usableW - (c - 1) * G) / c;
    const slotH = (usableH - (r - 1) * G) / r;

    let w, h;
    // Maintain EXACT aspect ratio without any stretching
    if (slotW / slotH > aspect) {
      h = slotH;
      w = h * aspect;
    } else {
      w = slotW;
      h = w / aspect;
    }

    const fillRate = (c * r * w * h) / (usableW * usableH);
    return {
      cols: c,
      rows: r,
      tw: parseFloat(w.toFixed(2)),
      th: parseFloat(h.toFixed(2)),
      total: c * r,
      orient: p.orient,
      pageW: p.pageW,
      pageH: p.pageH,
      M,
      G,
      fillRate,
    };
  }

  const pList =
    orientChoice === "portrait"
      ? [pages[0]]
      : orientChoice === "landscape"
      ? [pages[1]]
      : pages;

  // Handle custom grid
  if (choice === "custom") {
    const c = Math.max(1, Math.min(12, parseInt(customCols, 10) || 4));
    const r = Math.max(1, Math.min(25, parseInt(customRows, 10) || 13));
    const layouts = pList.map((p) => getLayoutForGrid(c, r, p));
    layouts.sort((a, b) => b.fillRate - a.fillRate);
    return layouts[0];
  }

  // Handle single ticket centered
  if (choice === "1") {
    const p = orientChoice !== "auto" ? pList[0] : (aspect >= 1.2 ? pages[1] : pages[0]);
    return getLayoutForGrid(1, 1, p);
  }

  // Determine target ticket count per page
  let target = 50;
  if (choice === "auto") {
    target = totalTickets >= 100 ? 50 : totalTickets >= 40 ? 20 : totalTickets >= 12 ? 12 : 4;
  } else {
    target = parseInt(choice, 10) || 50;
  }

  // Test practical grids from 1 to 10 columns and 1 to 25 rows
  const candidates = [];
  for (const p of pList) {
    for (let c = 1; c <= 10; c++) {
      for (let r = 1; r <= 25; r++) {
        const total = c * r;
        // Accept grids close to target
        if (total >= target && total <= Math.max(target + 4, Math.round(target * 1.15))) {
          candidates.push(getLayoutForGrid(c, r, p));
        }
      }
    }
  }

  // Prefer high fill rate among close candidate grids
  candidates.sort((a, b) => {
    const closeA = Math.abs(a.total - target) <= 4;
    const closeB = Math.abs(b.total - target) <= 4;
    if (closeA && closeB) {
      return b.fillRate - a.fillRate;
    }
    return Math.abs(a.total - target) - Math.abs(b.total - target);
  });

  if (candidates.length > 0) {
    return candidates[0];
  }

  // Fallback: pick the grid closest to target
  let best = null;
  let minDiff = Infinity;
  for (const p of pList) {
    for (let c = 1; c <= 10; c++) {
      for (let r = 1; r <= 25; r++) {
        const total = c * r;
        const diff = Math.abs(total - target);
        if (diff < minDiff) {
          minDiff = diff;
          best = getLayoutForGrid(c, r, p);
        }
      }
    }
  }
  return best || getLayoutForGrid(4, 13, pList[0]);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ── Component ───────────────────────────────────────────────── */
export default function TicketDesignerModal({ isOpen, onClose, tickets = [] }) {
  const [step, setStep] = useState(1);
  const [tplSrc, setTplSrc] = useState(null);
  const [tplSize, setTplSize] = useState({ w: 0, h: 0 });
  const [phs, setPhs] = useState([]);
  const [drag, setDrag] = useState(null);
  const [resize, setResize] = useState(null);
  const [selected, setSelected] = useState(null);
  const [genProgress, setGenProgress] = useState(0);
  const [isGen, setIsGen] = useState(false);

  // Density choice: "50", "40", "30", "20", "16", "12", "8", "4", "target_pages", "custom"
  const [ticketsPerPage, setTicketsPerPage] = useState(tickets.length >= 60 ? "50" : (tickets.length >= 25 ? "20" : "50"));
  const [targetPages, setTargetPages] = useState(6);
  const [customCols, setCustomCols] = useState(4);
  const [customRows, setCustomRows] = useState(13);
  const [pageOrient, setPageOrient] = useState("auto"); // "auto", "portrait", "landscape"
  // Background-removed code color: "#000000" (black) or "#ffffff" (white)
  const [codeColor, setCodeColor] = useState("#000000");

  const areaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(tplSrc ? 2 : 1);
    }
  }, [isOpen]);

  /* ── Upload Handler ──────────────────────────────────────── */
  const onFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.warning("Please upload a valid image file (PNG, JPG, or WebP).");
      return;
    }

    if (tplSrc && tplSrc.startsWith("blob:")) {
      try { URL.revokeObjectURL(tplSrc); } catch {}
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setTplSize({ w: img.naturalWidth, h: img.naturalHeight });
      setTplSrc(objectUrl);
      setPhs([]);
      setStep(2);
    };
    img.onerror = () => {
      toast.error("Could not load image. Please try another image file.");
    };
    img.src = objectUrl;
  }, [tplSrc]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      onFile(e.dataTransfer.files[0]);
    }
  }, [onFile]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  /* ── Placeholder Management ──────────────────────────────── */
  const addPh = (type) => {
    const def = PH_TYPES.find((p) => p.type === type);
    const isImg = def?.img;
    const newId = uid();
    setPhs((prev) => [
      ...prev,
      {
        id: newId,
        type,
        label: def.label,
        color: def.color,
        isImg,
        x: 35,
        y: 35,
        w: isImg ? (type === "barcode" ? 35 : 22) : 32,
        h: isImg ? (type === "barcode" ? 18 : 28) : 10,
        textColor: "#ffffff",
      },
    ]);
    setSelected(newId);
  };

  const delPh = (id) => {
    setPhs((p) => p.filter((v) => v.id !== id));
    if (selected === id) setSelected(null);
  };

  const updatePh = (id, patch) => {
    setPhs((p) => p.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  /* ── Drag & Resize Listeners ─────────────────────────────── */
  const evPos = (e) => {
    return e.touches
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: e.clientX, y: e.clientY };
  };

  const startMove = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = evPos(e);
    const ph = phs.find((p) => p.id === id);
    if (!ph) return;
    setDrag({ id, sx: pos.x, sy: pos.y, ox: ph.x, oy: ph.y });
    setSelected(id);
  };

  const startResize = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = evPos(e);
    const ph = phs.find((p) => p.id === id);
    if (!ph) return;
    setResize({ id, sx: pos.x, sy: pos.y, ow: ph.w, oh: ph.h });
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!areaRef.current) return;
      const rect = areaRef.current.getBoundingClientRect();
      const pos = e.touches
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: e.clientX, y: e.clientY };

      if (drag) {
        const dx = ((pos.x - drag.sx) / rect.width) * 100;
        const dy = ((pos.y - drag.sy) / rect.height) * 100;
        setPhs((p) =>
          p.map((v) =>
            v.id === drag.id
              ? {
                  ...v,
                  x: Math.max(0, Math.min(100 - v.w, drag.ox + dx)),
                  y: Math.max(0, Math.min(100 - v.h, drag.oy + dy)),
                }
              : v
          )
        );
      }
      if (resize) {
        const dw = ((pos.x - resize.sx) / rect.width) * 100;
        const dh = ((pos.y - resize.sy) / rect.height) * 100;
        setPhs((p) =>
          p.map((v) =>
            v.id === resize.id
              ? {
                  ...v,
                  w: Math.max(6, Math.min(100 - v.x, resize.ow + dw)),
                  h: Math.max(4, Math.min(100 - v.y, resize.oh + dh)),
                }
              : v
          )
        );
      }
    };

    const onUp = () => {
      setDrag(null);
      setResize(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [drag, resize]);

  /* ── Layout Computation ──────────────────────────────────── */
  const effectiveChoice =
    ticketsPerPage === "target_pages"
      ? String(Math.max(1, Math.ceil(tickets.length / (parseInt(targetPages, 10) || 6))))
      : ticketsPerPage;

  const layout =
    tplSize.w > 0
      ? computeA4Layout(
          tplSize.w,
          tplSize.h,
          effectiveChoice,
          tickets.length,
          customCols,
          customRows,
          pageOrient
        )
      : null;
  const totalPages = layout ? Math.ceil(tickets.length / layout.total) : 0;

  /* ── Generate & Trigger Print ────────────────────────────── */
  const handleGenerate = async () => {
    if (!layout || phs.length === 0 || tickets.length === 0) return;
    setIsGen(true);
    setGenProgress(0);
    setStep(3);

    try {
      const hasQR = phs.some((p) => p.type === "qr_code");
      const hasBC = phs.some((p) => p.type === "barcode");
      const data = [];
      const BATCH = 20;

      // Generate 100% transparent QR codes and Barcodes client-side
      for (let i = 0; i < tickets.length; i += BATCH) {
        const batch = tickets.slice(i, i + BATCH);
        const batchResults = await Promise.all(
          batch.map(async (t) => {
            const d = { ...t, _qr: null, _bc: null };
            if (hasQR) {
              d._qr = await qrDataURL(`${window.location.origin}/verify/${t.ticketCode}`, 450, codeColor);
            }
            if (hasBC) {
              d._bc = barcodeDataURL(t.ticketCode, codeColor);
            }
            return d;
          })
        );
        data.push(...batchResults);
        setGenProgress(Math.min(90, Math.round((data.length / tickets.length) * 85)));
      }

      setGenProgress(94);

      // Build print HTML document with natural ratio and transparent elements
      const { cols, rows, tw, th, total: perPage, orient, pageW, pageH, M, G } = layout;
      const pageCount = Math.ceil(data.length / perPage);
      const allPages = [];

      for (let p = 0; p < pageCount; p++) {
        const slice = data.slice(p * perPage, (p + 1) * perPage);
        const pageCards = [];

        for (const t of slice) {
          const overlays = [];
          for (const ph of phs) {
            const l = (ph.x / 100) * tw;
            const top = (ph.y / 100) * th;
            const w = (ph.w / 100) * tw;
            const h = (ph.h / 100) * th;

            if (ph.type === "qr_code") {
              if (t._qr) {
                // Background removed transparent QR PNG
                overlays.push(`
                  <div style="position:absolute;left:${l.toFixed(2)}mm;top:${top.toFixed(2)}mm;width:${w.toFixed(2)}mm;height:${h.toFixed(2)}mm;display:flex;align-items:center;justify-content:center;background:transparent;box-sizing:border-box;">
                    <img src="${t._qr}" style="width:100%;height:100%;object-fit:contain;display:block;background:transparent;" />
                  </div>
                `);
              }
            } else if (ph.type === "barcode") {
              if (t._bc) {
                // Background removed transparent Barcode PNG
                overlays.push(`
                  <div style="position:absolute;left:${l.toFixed(2)}mm;top:${top.toFixed(2)}mm;width:${w.toFixed(2)}mm;height:${h.toFixed(2)}mm;display:flex;align-items:center;justify-content:center;background:transparent;box-sizing:border-box;">
                    <img src="${t._bc}" style="width:100%;height:100%;object-fit:contain;display:block;background:transparent;" />
                  </div>
                `);
              }
            } else {
              // Background removed transparent text overlay
              const fontSizeMm = Math.max(1.8, Math.min(3.4, h * 0.55));
              overlays.push(`
                <div style="position:absolute;left:${l.toFixed(2)}mm;top:${top.toFixed(2)}mm;width:${w.toFixed(2)}mm;height:${h.toFixed(2)}mm;display:flex;align-items:center;justify-content:center;font-size:${fontSizeMm.toFixed(2)}mm;font-weight:900;color:${ph.textColor || "#ffffff"};text-shadow:0 1px 2px rgba(0,0,0,0.8),0 0 2px rgba(0,0,0,0.9);text-align:center;overflow:hidden;line-height:1.1;white-space:nowrap;text-overflow:ellipsis;font-family:'Segoe UI',Arial,sans-serif;background:transparent;">
                  ${escHTML(ticketValue(t, ph.type))}
                </div>
              `);
            }
          }

          // Individual ticket maintaining exact aspect ratio with dashed cutting guide
          pageCards.push(`
            <div class="tk" style="position:relative;width:${tw.toFixed(2)}mm;height:${th.toFixed(2)}mm;overflow:hidden;box-sizing:border-box;outline:1px dashed rgba(0,0,0,0.22);">
              ${tplSrc ? `<img src="${tplSrc}" class="tk-bg" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:fill;z-index:1;display:block;" />` : `<div style="position:absolute;inset:0;background:#ffffff;"></div>`}
              <div class="tk-layer" style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:2;">
                ${overlays.join("")}
              </div>
            </div>
          `);
        }

        allPages.push(`
          <div class="pg">
            <div class="grid">
              ${pageCards.join("")}
            </div>
          </div>
        `);
      }

      setGenProgress(98);

      const printDocHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Enactus Event Tickets – Ready to Print (${data.length} Tickets)</title>
  <style>
    @page {
      size: ${orient === "landscape" ? "A4 landscape" : "A4 portrait"};
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #09090b;
      color: #000;
      margin: 0 !important;
      padding: 0 !important;
    }
    .no-print {
      position: sticky;
      top: 0;
      z-index: 99999;
      background: #09090b;
      border-bottom: 2px solid #f59e0b;
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #ffffff;
      box-shadow: 0 4px 25px rgba(0,0,0,0.8);
    }
    .pg {
      width: ${pageW}mm;
      height: ${pageH}mm;
      position: relative;
      margin: 0 auto;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: ${M}mm;
    }
    .pg:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(${cols}, ${tw.toFixed(2)}mm);
      grid-template-rows: repeat(${rows}, ${th.toFixed(2)}mm);
      gap: ${G}mm;
      align-content: center;
      justify-content: center;
    }
    @media screen {
      body {
        padding-bottom: 40px;
      }
      .pg {
        background: #ffffff;
        margin: 24px auto;
        border-radius: 4px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.7);
      }
    }
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        background: transparent !important;
      }
      .pg {
        background: transparent !important;
        box-shadow: none !important;
        margin: 0 !important;
        padding: ${M}mm !important;
        border-radius: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <div style="font-weight:900;font-size:17px;color:#f59e0b;display:flex;align-items:center;gap:8px;">
        <span>🖨️ Enactus Ticket Batch Print</span>
        <span style="font-size:12px;background:#f59e0b20;color:#f59e0b;padding:2px 8px;border-radius:6px;border:1px solid #f59e0b40;">A4 ${orient}</span>
      </div>
      <div style="font-size:12px;color:#94a3b8;margin-top:2px;">
        <strong>${data.length} Tickets</strong> across <strong>${pageCount} Sheet${pageCount !== 1 ? "s" : ""}</strong> (${perPage} per A4 page · Ticket size: ${Math.round(tw)}mm × ${Math.round(th)}mm · Perfect ratio)
      </div>
    </div>
    <div style="display:flex;gap:12px;">
      <button onclick="window.print()" style="padding:10px 24px;background:#f59e0b;color:#000000;font-weight:900;font-size:14px;border:none;border-radius:10px;cursor:pointer;box-shadow:0 2px 10px rgba(245,158,11,0.5);display:flex;align-items:center;gap:6px;">
        <span>🖨️ Print / Save PDF</span>
      </button>
      <button onclick="window.close()" style="padding:10px 18px;background:#27272a;color:#d4d4d8;font-weight:600;font-size:13px;border:1px solid #3f3f46;border-radius:10px;cursor:pointer;">
        ✕ Close
      </button>
    </div>
  </div>

  ${allPages.join("")}

  <script>
    // Wait for images to resolve before triggering print
    window.onload = function() {
      var imgs = Array.from(document.images);
      var promises = imgs.map(function(img) {
        return img.complete ? Promise.resolve() : new Promise(function(resolve) {
          img.onload = img.onerror = resolve;
        });
      });
      Promise.all(promises).then(function() {
        setTimeout(function() {
          window.print();
        }, 350);
      });
    };
  <\/script>
</body>
</html>`;

      setGenProgress(100);

      let opened = false;
      try {
        const printWin = window.open("", "_blank");
        if (printWin) {
          printWin.document.open();
          printWin.document.write(printDocHtml);
          printWin.document.close();
          opened = true;
        }
      } catch (e) {
        console.warn("window.open failed:", e);
      }

      if (!opened) {
        let iframe = document.getElementById("print-ticket-frame");
        if (!iframe) {
          iframe = document.createElement("iframe");
          iframe.id = "print-ticket-frame";
          iframe.style.position = "fixed";
          iframe.style.right = "0";
          iframe.style.bottom = "0";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "none";
          document.body.appendChild(iframe);
        }
        iframe.contentDocument.open();
        iframe.contentDocument.write(printDocHtml);
        iframe.contentDocument.close();
        toast.info("Opening print dialog directly in page...");
      }
    } catch (err) {
      console.error("Print generation error:", err);
      toast.error("Generation error: " + err.message);
    } finally {
      setTimeout(() => setIsGen(false), 500);
    }
  };

  if (!isOpen) return null;

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-950 border border-amber-500/30 rounded-3xl max-w-4xl w-full shadow-2xl relative my-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold p-1 z-20"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="p-5 pb-0 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white text-2xl shadow-lg">
            🖨️
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white">A4 Ticket Sheet Designer</h2>
            <p className="text-xs text-neutral-400">
              Natural ticket aspect ratio · Background-removed QR & Barcode PNGs · Multiple tickets per A4
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 px-5 mt-4 mb-1">
          {["Upload PNG", "Position Placeholders", "Print A4 Sheet"].map((l, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <React.Fragment key={l}>
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                    active
                      ? "bg-amber-500 text-black scale-110 shadow-lg"
                      : done
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                      : "bg-neutral-800 text-neutral-500 border border-neutral-700"
                  }`}
                >
                  {done ? "✓" : n}
                </div>
                {i < 2 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded ${done ? "bg-amber-500/40" : "bg-neutral-800"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex px-5 mb-3">
          {["Upload PNG", "Position Placeholders", "Print A4 Sheet"].map((l, i) => (
            <div
              key={l}
              className={`flex-1 text-center text-[10px] font-semibold ${
                step === i + 1 ? "text-amber-400" : "text-neutral-600"
              }`}
            >
              {l}
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          {/* ═══ STEP 1: Upload Template ═══ */}
          {step === 1 && (
            <div
              className="border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all bg-neutral-900/30 hover:bg-neutral-900/60"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={() => document.getElementById("tpl-upload").click()}
            >
              <input
                id="tpl-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <div className="text-6xl mb-4">🖼️</div>
              <h3 className="text-xl font-bold text-white mb-2">Upload Your Ticket Design (PNG / JPG)</h3>
              <p className="text-sm text-neutral-400 max-w-md mx-auto mb-5">
                Upload your design. The generator will calculate the <strong>perfect aspect ratio</strong> to arrange tickets neatly on standard A4 paper ready for cutting.
              </p>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-sm transition shadow-lg">
                📁 Choose Image File
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Interactive Designer ═══ */}
          {step === 2 && tplSrc && (
            <div className="space-y-4">
              {/* Toolbar: Add Placeholders */}
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wider font-bold text-neutral-300">
                    Click to add placeholder onto ticket:
                  </p>
                  <span className="text-[11px] text-neutral-500">
                    {phs.length} item{phs.length !== 1 ? "s" : ""} placed
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PH_TYPES.map((p) => {
                    const count = phs.filter((ph) => ph.type === p.type).length;
                    return (
                      <button
                        key={p.type}
                        onClick={() => addPh(p.type)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                          count > 0
                            ? "bg-neutral-800/80 border-amber-500/50 text-amber-300 shadow-sm"
                            : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white"
                        }`}
                      >
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                        {count > 0 && <span className="text-[10px] bg-amber-500/30 px-1.5 rounded-md">+{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Design Canvas (Transparent placeholders over background) */}
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 flex flex-col items-center justify-center">
                <div
                  ref={areaRef}
                  className="relative select-none shadow-2xl rounded-xl overflow-hidden border border-neutral-700"
                  style={{
                    width: "100%",
                    maxWidth: 620,
                    aspectRatio: `${tplSize.w} / ${tplSize.h}`,
                  }}
                  onClick={() => setSelected(null)}
                >
                  {/* High-res template preview */}
                  <img
                    src={tplSrc}
                    alt="Template"
                    className="w-full h-full object-fill pointer-events-none"
                    draggable={false}
                  />

                  {/* Drag-and-drop transparent placeholder boxes */}
                  {phs.map((ph) => {
                    const def = PH_TYPES.find((p) => p.type === ph.type);
                    const isSel = selected === ph.id;
                    return (
                      <div
                        key={ph.id}
                        className="absolute flex items-center justify-center cursor-move group select-none"
                        style={{
                          left: `${ph.x}%`,
                          top: `${ph.y}%`,
                          width: `${ph.w}%`,
                          height: `${ph.h}%`,
                          border: `2px ${isSel ? "solid" : "dashed"} ${ph.color}`,
                          backgroundColor: `${ph.color}18`, // Transparent tint
                          borderRadius: 4,
                          zIndex: isSel ? 30 : 15,
                        }}
                        onMouseDown={(e) => startMove(e, ph.id)}
                        onTouchStart={(e) => startMove(e, ph.id)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(ph.id);
                        }}
                      >
                        {/* Display label inside box */}
                        <span
                          className="text-[10px] font-black text-white pointer-events-none text-center px-1 leading-tight"
                          style={{
                            textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)",
                            color: ph.textColor || "#ffffff",
                          }}
                        >
                          {ph.isImg ? (
                            <span className="text-xs">{def?.icon} {ph.label}</span>
                          ) : (
                            def?.sample || ph.label
                          )}
                        </span>

                        {/* Delete cross */}
                        <button
                          className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            delPh(ph.id);
                          }}
                          title="Delete placeholder"
                        >
                          ✕
                        </button>

                        {/* Resize handle (bottom-right) */}
                        <div
                          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-sm cursor-se-resize shadow"
                          style={{ backgroundColor: ph.color }}
                          onMouseDown={(e) => startResize(e, ph.id)}
                          onTouchStart={(e) => startResize(e, ph.id)}
                          title="Drag to resize"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-neutral-400 mt-2">
                  💡 Drag boxes to position. Drag corner handle to resize. All codes & text render as 100% transparent PNG overlays with no background box.
                </p>
              </div>

              {/* Code & Text Styling Toolbars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 text-xs">
                {/* Code Color (Black or White) */}
                <div>
                  <span className="font-bold text-neutral-300 block mb-1.5">
                    Barcode & QR Code Color (Transparent PNG):
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCodeColor("#000000")}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition ${
                        codeColor === "#000000"
                          ? "bg-black text-white border-amber-400 ring-2 ring-amber-400/30"
                          : "bg-neutral-800 text-neutral-400 border-neutral-700"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-black border border-neutral-600" />
                      Black (Dark)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeColor("#ffffff")}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border transition ${
                        codeColor === "#ffffff"
                          ? "bg-white text-black border-amber-400 ring-2 ring-amber-400/30"
                          : "bg-neutral-800 text-neutral-400 border-neutral-700"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-white border border-neutral-300" />
                      White (Light)
                    </button>
                  </div>
                </div>

                {/* Text Color for selected element */}
                <div>
                  <span className="font-bold text-neutral-300 block mb-1.5">
                    {selected && phs.find((p) => p.id === selected && !p.isImg)
                      ? `Text Color (${phs.find((p) => p.id === selected)?.label}):`
                      : "Select a text field to change its color:"}
                  </span>
                  <div className="flex items-center gap-2">
                    {TXT_COLORS.map((c) => (
                      <button
                        key={c}
                        disabled={!selected || phs.find((p) => p.id === selected)?.isImg}
                        onClick={() => selected && updatePh(selected, { textColor: c })}
                        className={`w-6 h-6 rounded-full border-2 transition disabled:opacity-30 ${
                          phs.find((p) => p.id === selected)?.textColor === c
                            ? "border-amber-400 scale-125 shadow-md"
                            : "border-neutral-700"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Page Format & Layout Controls */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Tickets Per A4 Page</span>
                      <span className="text-[10px] text-amber-400 font-normal">
                        {ticketsPerPage === "50" ? "🔥 6 Pages for 300" : ""}
                      </span>
                    </label>
                    <select
                      value={ticketsPerPage}
                      onChange={(e) => setTicketsPerPage(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-semibold"
                    >
                      <option value="50">⚡ 50 per Sheet (Fit 300 in 6 Pages - Ultra Paper Saver)</option>
                      <option value="40">40 per Sheet (Fit 300 in 8 Pages)</option>
                      <option value="30">30 per Sheet (Fit 300 in 10 Pages)</option>
                      <option value="20">20 per Sheet (Fit 300 in 15 Pages)</option>
                      <option value="16">16 per Sheet (Fit 300 in 19 Pages - High Density)</option>
                      <option value="12">12 per Sheet (Fit 300 in 25 Pages - Medium Density)</option>
                      <option value="8">8 per Sheet (Fit 300 in 38 Pages - Large Tickets)</option>
                      <option value="6">6 per Sheet (Fit 300 in 50 Pages)</option>
                      <option value="4">4 per Sheet (Fit 300 in 75 Pages - Extra Large)</option>
                      <option value="1">1 per Sheet (Full Page Badge / Sign)</option>
                      <option value="target_pages">🎯 Target Page Count (e.g. 6 Sheets)</option>
                      <option value="custom">🛠️ Custom Grid (Set Columns & Rows)</option>
                      <option value="auto">⭐ Auto Best Paper Fill</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Paper Orientation
                    </label>
                    <div className="flex gap-2">
                      {[
                        { id: "auto", label: "Auto Fit" },
                        { id: "portrait", label: "Portrait 📄" },
                        { id: "landscape", label: "Landscape 📃" },
                      ].map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setPageOrient(o.id)}
                          className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl border transition ${
                            pageOrient === o.id
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm"
                              : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sub-controls if Target Pages chosen */}
                {ticketsPerPage === "target_pages" && (
                  <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-full sm:w-auto">
                      <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Desired Total A4 Sheets:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={targetPages}
                        onChange={(e) => setTargetPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-28 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="text-xs text-neutral-400">
                      💡 With <strong>{tickets.length} tickets</strong> targetting <strong>{targetPages} sheets</strong>, each A4 page will hold approximately <strong>{Math.ceil(tickets.length / (parseInt(targetPages, 10) || 6))} tickets</strong>.
                    </div>
                  </div>
                )}

                {/* Sub-controls if Custom Grid chosen */}
                {ticketsPerPage === "custom" && (
                  <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-3 flex flex-wrap items-center gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Columns (across):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={customCols}
                        onChange={(e) => setCustomCols(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-24 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1">
                        Rows (down):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="25"
                        value={customRows}
                        onChange={(e) => setCustomRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-24 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="text-xs text-neutral-400">
                      = <strong>{customCols * customRows} tickets</strong> per A4 sheet ({customCols} cols × {customRows} rows)
                    </div>
                  </div>
                )}

                {/* Live Layout Summary & Paper Savings Banner */}
                {layout && (
                  <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 border border-amber-500/40 rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-inner">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">📄</span>
                      <div>
                        <div className="text-white font-black text-sm flex items-center gap-2">
                          <span>{tickets.length} Tickets → {totalPages} A4 Sheet{totalPages !== 1 ? "s" : ""}</span>
                          <span className="bg-amber-400 text-black text-[11px] font-black px-2 py-0.5 rounded-full">
                            {layout.total} / page
                          </span>
                        </div>
                        <div className="text-neutral-400 text-[11px] mt-0.5">
                          Grid: <strong>{layout.cols} cols × {layout.rows} rows</strong> · Ticket: <strong>{Math.round(layout.tw)}mm × {Math.round(layout.th)}mm</strong> ({layout.orient})
                        </div>
                      </div>
                    </div>
                    {tickets.length >= 20 && totalPages < Math.ceil(tickets.length / 4) && (
                      <div className="text-emerald-400 font-extrabold text-[11px] bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
                        <span>🌱</span>
                        <span>Saved {Math.ceil(tickets.length / 4) - totalPages} A4 sheets vs 4/page!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTplSrc(null);
                    setStep(1);
                  }}
                  className="px-5 py-3 bg-neutral-800 hover:bg-neutral-700 text-slate-300 font-semibold rounded-xl text-sm transition"
                >
                  ← Change Design
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={phs.length === 0 || tickets.length === 0}
                  className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold rounded-xl text-sm transition-all shadow-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  🖨️ Generate & Print {tickets.length} Tickets ({totalPages} A4 Sheet{totalPages !== 1 ? "s" : ""})
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Progress & Completion ═══ */}
          {step === 3 && (
            <div className="text-center py-10 space-y-6">
              <div className="text-6xl animate-bounce">{isGen ? "⚙️" : "✅"}</div>
              <h3 className="text-xl font-bold text-white">
                {isGen ? "Rendering High-Resolution Ticket Sheets..." : "Print Window Opened!"}
              </h3>
              <p className="text-sm text-neutral-400 max-w-md mx-auto">
                {isGen
                  ? `Rendering ${tickets.length} tickets across ${totalPages} A4 sheets at natural aspect ratio with transparent elements...`
                  : "Your browser print window has opened. Each A4 sheet is formatted with natural ratio tickets and dashed cutting lines, ready to print or save as PDF."}
              </p>

              {/* Progress bar */}
              <div className="max-w-xs mx-auto">
                <div className="bg-neutral-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${genProgress}%` }}
                  />
                </div>
                <div className="text-xs text-neutral-400 mt-2">{genProgress}%</div>
              </div>

              {!isGen && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <button
                    onClick={handleGenerate}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-sm transition shadow-lg"
                  >
                    🖨️ Re-Open Print Window
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-xl text-sm border border-neutral-700 transition"
                  >
                    ← Back to Designer
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-sm border border-neutral-700 transition"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
