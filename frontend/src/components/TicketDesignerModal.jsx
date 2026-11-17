import React, { useState, useRef, useEffect, useCallback } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

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

const TXT_COLORS = ["#ffffff", "#000000", "#f59e0b", "#14b8a6", "#ef4444"];

/* ── Helpers ─────────────────────────────────────────────────── */
function barcodeDataURL(text) {
  try {
    const c = document.createElement("canvas");
    JsBarcode(c, text, {
      format: "CODE128",
      width: 2,
      height: 60,
      displayValue: false,
      margin: 4,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return c.toDataURL("image/png");
  } catch (err) {
    console.error("Barcode generation error:", err);
    return "";
  }
}

async function qrDataURL(text, size = 350) {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
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
 * Calculate optimal ticket dimensions and packing on standard A4 paper (210 x 297 mm)
 * Ensures tickets are large, sharp, legible, and easy to cut.
 */
function computeA4Layout(tw, th, targetCount = "auto") {
  const aspect = tw / th; // width / height ratio
  const M = 6;  // 6mm page margin
  const G = 3;  // 3mm cutting gap between tickets

  const pages = [
    { pageW: 210, pageH: 297, orient: "portrait" },
    { pageW: 297, pageH: 210, orient: "landscape" },
  ];

  // Presets for specific tickets-per-sheet counts
  const presets = {
    "1": [{ c: 1, r: 1 }],
    "2": [{ c: 1, r: 2 }, { c: 2, r: 1 }],
    "3": [{ c: 1, r: 3 }, { c: 3, r: 1 }],
    "4": [{ c: 2, r: 2 }, { c: 1, r: 4 }],
    "6": [{ c: 2, r: 3 }, { c: 3, r: 2 }],
    "8": [{ c: 2, r: 4 }, { c: 4, r: 2 }],
    "10": [{ c: 2, r: 5 }, { c: 5, r: 2 }],
  };

  const candidates = [];

  for (const { pageW, pageH, orient } of pages) {
    const usableW = pageW - 2 * M;
    const usableH = pageH - 2 * M;

    if (targetCount !== "auto" && presets[targetCount]) {
      for (const { c, r } of presets[targetCount]) {
        // Fit by width
        let w = (usableW - (c - 1) * G) / c;
        let h = w / aspect;
        if (r * h + (r - 1) * G > usableH) {
          // If height exceeds page, fit by height
          h = (usableH - (r - 1) * G) / r;
          w = h * aspect;
        }
        candidates.push({
          cols: c,
          rows: r,
          tw: w,
          th: h,
          total: c * r,
          orient,
          pageW,
          pageH,
          M,
          G,
          score: w * h,
        });
      }
    } else {
      // Auto mode: test sensible, readable grids (cols 1..3, rows 1..4)
      // Never allow ticket width under 70mm or height under 32mm
      for (let c = 1; c <= 3; c++) {
        for (let r = 1; r <= 4; r++) {
          let w = (usableW - (c - 1) * G) / c;
          let h = w / aspect;
          if (r * h + (r - 1) * G > usableH) {
            h = (usableH - (r - 1) * G) / r;
            w = h * aspect;
          }
          if (w >= 70 && h >= 30) {
            // Priority: good readable size with high packing density
            const score = (c * r) * 1000 + w;
            candidates.push({
              cols: c,
              rows: r,
              tw: w,
              th: h,
              total: c * r,
              orient,
              pageW,
              pageH,
              M,
              G,
              score,
            });
          }
        }
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  }

  // Fallback: 2 large tickets on portrait A4
  const fallbackW = 210 - 2 * M;
  const fallbackH = Math.min(fallbackW / aspect, 130);
  return {
    cols: 1,
    rows: 2,
    tw: fallbackW,
    th: fallbackH,
    total: 2,
    orient: "portrait",
    pageW: 210,
    pageH: 297,
    M,
    G,
  };
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
  const [ticketsPerPage, setTicketsPerPage] = useState("auto"); // "auto", "1", "2", "3", "4", "6", "8"
  const areaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(tplSrc ? 2 : 1);
    }
  }, [isOpen]);

  /* ── Upload Handler ──────────────────────────────────────── */
  const onFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setTplSize({ w: img.naturalWidth, h: img.naturalHeight });
        setTplSrc(e.target.result);
        setPhs([]);
        setStep(2);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

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
        w: isImg ? (type === "barcode" ? 34 : 20) : 32,
        h: isImg ? (type === "barcode" ? 18 : 26) : 10,
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
  const layout = tplSize.w > 0 ? computeA4Layout(tplSize.w, tplSize.h, ticketsPerPage) : null;
  const totalPages = layout ? Math.ceil(tickets.length / layout.total) : 0;

  /* ── Generate & Trigger Print ────────────────────────────── */
  const handleGenerate = async () => {
    if (!layout || phs.length === 0 || tickets.length === 0) return;
    setIsGen(true);
    setGenProgress(0);
    setStep(3);

    const hasQR = phs.some((p) => p.type === "qr_code");
    const hasBC = phs.some((p) => p.type === "barcode");
    const data = [];
    const BATCH = 15;

    // Generate QR codes and Barcodes for all tickets client-side
    for (let i = 0; i < tickets.length; i += BATCH) {
      const batch = tickets.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        batch.map(async (t) => {
          const d = { ...t, _qr: null, _bc: null };
          if (hasQR) {
            d._qr = await qrDataURL(`${window.location.origin}/verify/${t.ticketCode}`, 350);
          }
          if (hasBC) {
            d._bc = barcodeDataURL(t.ticketCode);
          }
          return d;
        })
      );
      data.push(...batchResults);
      setGenProgress(Math.round((data.length / tickets.length) * 85));
    }

    setGenProgress(94);

    // Build print HTML document
    const { cols, rows, tw, th, total: perPage, orient, pageW, pageH, M, G } = layout;
    const pageCount = Math.ceil(data.length / perPage);
    let pagesHtml = "";

    for (let p = 0; p < pageCount; p++) {
      const slice = data.slice(p * perPage, (p + 1) * perPage);
      let cardsHtml = "";

      for (const t of slice) {
        let overlaysHtml = "";
        for (const ph of phs) {
          const l = (ph.x / 100) * tw;
          const top = (ph.y / 100) * th;
          const w = (ph.w / 100) * tw;
          const h = (ph.h / 100) * th;

          if (ph.type === "qr_code") {
            if (t._qr) {
              overlaysHtml += `
                <div style="position:absolute;left:${l.toFixed(2)}mm;top:${top.toFixed(2)}mm;width:${w.toFixed(2)}mm;height:${h.toFixed(2)}mm;display:flex;align-items:center;justify-content:center;background:#ffffff;padding:1mm;border-radius:1.5mm;box-sizing:border-box;">
                  <img src="${t._qr}" style="width:100%;height:100%;object-fit:contain;display:block;" />
                </div>
              `;
            }
          } else if (ph.type === "barcode") {
            if (t._bc) {
              overlaysHtml += `
                <div style="position:absolute;left:${l.toFixed(2)}mm;top:${top.toFixed(2)}mm;width:${w.toFixed(2)}mm;height:${h.toFixed(2)}mm;display:flex;align-items:center;justify-content:center;background:#ffffff;padding:1mm;border-radius:1.5mm;box-sizing:border-box;">
                  <img src="${t._bc}" style="width:100%;height:100%;object-fit:contain;display:block;" />
                </div>
              `;
            }
          } else {
            // Text overlays
            const fontSizeMm = Math.max(2.2, h * 0.52);
            overlaysHtml += `
              <div style="position:absolute;left:${l.toFixed(2)}mm;top:${top.toFixed(2)}mm;width:${w.toFixed(2)}mm;height:${h.toFixed(2)}mm;display:flex;align-items:center;justify-content:center;font-size:${fontSizeMm.toFixed(2)}mm;font-weight:800;color:${ph.textColor || "#ffffff"};text-shadow:0 1px 2px rgba(0,0,0,0.8),0 0 1px rgba(0,0,0,0.9);text-align:center;overflow:hidden;line-height:1.15;word-break:break-word;font-family:'Segoe UI',Arial,sans-serif;">
                ${escHTML(ticketValue(t, ph.type))}
              </div>
            `;
          }
        }

        // CRITICAL FIX: The background image MUST be an <img> element, NOT CSS background!
        // Browsers strip CSS background-image during printing by default.
        // An <img> tag is guaranteed to print on every browser, printer, and PDF exporter!
        cardsHtml += `
          <div class="tk" style="position:relative;width:${tw.toFixed(2)}mm;height:${th.toFixed(2)}mm;overflow:hidden;box-sizing:border-box;border-radius:2mm;">
            <img src="${tplSrc}" class="tk-bg" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:fill;z-index:1;display:block;" />
            <div class="tk-layer" style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:2;">
              ${overlaysHtml}
            </div>
          </div>
        `;
      }

      pagesHtml += `
        <div class="pg">
          ${cardsHtml}
        </div>
      `;
    }

    const printDocHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Enactus Event Tickets – Ready to Print (${data.length} Tickets)</title>
  <style>
    @page {
      size: ${orient === "landscape" ? "A4 landscape" : "A4 portrait"};
      margin: ${M}mm;
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
      background: #0f172a;
      color: #000;
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
      box-shadow: 0 4px 25px rgba(0,0,0,0.6);
    }
    .pg {
      display: grid;
      grid-template-columns: repeat(${cols}, ${tw.toFixed(2)}mm);
      grid-template-rows: repeat(${rows}, ${th.toFixed(2)}mm);
      gap: ${G}mm;
      width: ${(pageW - 2 * M).toFixed(2)}mm;
      height: ${(pageH - 2 * M).toFixed(2)}mm;
      align-content: start;
      justify-content: center;
      margin: 0 auto;
      page-break-after: always;
      break-after: page;
    }
    .pg:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    @media screen {
      body {
        padding-bottom: 40px;
      }
      .pg {
        background: #ffffff;
        padding: ${M}mm;
        margin: 24px auto;
        border-radius: 6px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
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
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <div style="font-weight:900;font-size:17px;color:#f59e0b;display:flex;align-items:center;gap:8px;">
        <span>🖨️ Enactus Ticket Batch</span>
        <span style="font-size:12px;background:#f59e0b20;color:#f59e0b;padding:2px 8px;border-radius:6px;border:1px solid #f59e0b40;">A4 ${orient}</span>
      </div>
      <div style="font-size:12px;color:#94a3b8;margin-top:2px;">
        <strong>${data.length} Tickets</strong> across <strong>${pageCount} Sheet${pageCount !== 1 ? "s" : ""}</strong> (${cols}×${rows} = ${perPage} per A4 page · Ticket size: ${Math.round(tw)}mm × ${Math.round(th)}mm)
      </div>
    </div>
    <div style="display:flex;gap:12px;">
      <button onclick="window.print()" style="padding:10px 24px;background:#f59e0b;hover:background:#fbbf24;color:#000000;font-weight:800;font-size:14px;border:none;border-radius:10px;cursor:pointer;box-shadow:0 2px 10px rgba(245,158,11,0.5);display:flex;align-items:center;gap:6px;">
        <span>🖨️ Print / Save PDF</span>
      </button>
      <button onclick="window.close()" style="padding:10px 18px;background:#27272a;color:#d4d4d8;font-weight:600;font-size:13px;border:1px solid #3f3f46;border-radius:10px;cursor:pointer;">
        ✕ Close
      </button>
    </div>
  </div>

  ${pagesHtml}

  <script>
    // Wait for all images (backgrounds + barcodes + QRs) to fully load before triggering print
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

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printDocHtml);
      printWin.document.close();
    }

    setTimeout(() => setIsGen(false), 600);
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
            <h2 className="text-xl sm:text-2xl font-black text-white">Ticket Print Designer (A4 Ready)</h2>
            <p className="text-xs text-neutral-400">
              Upload your design → Drag & position placeholders → Auto-pack onto A4 sheets for print
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 px-5 mt-4 mb-1">
          {["Upload PNG", "Design & Position", "Print A4"].map((l, i) => {
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
          {["Upload PNG", "Design & Position", "Print A4"].map((l, i) => (
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
                Drag and drop your ticket design image here, or click to browse. The design will be used as the high-resolution background for every printed ticket.
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

              {/* Design Canvas */}
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 flex flex-col items-center justify-center">
                <div
                  ref={areaRef}
                  className="relative select-none shadow-2xl rounded-xl overflow-hidden border border-neutral-700"
                  style={{
                    width: "100%",
                    maxWidth: 580,
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

                  {/* Drag-and-drop placeholder boxes */}
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
                          backgroundColor: `${ph.color}35`,
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
                          className="text-[10px] font-extrabold text-white pointer-events-none text-center px-1 leading-tight"
                          style={{
                            textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 1px rgba(0,0,0,0.9)",
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
                  💡 Drag boxes to position. Drag bottom-right corner to resize. Click to select.
                </p>
              </div>

              {/* Text Color Toolbar when a text placeholder is selected */}
              {selected && phs.find((p) => p.id === selected && !p.isImg) && (
                <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs">
                  <span className="font-bold text-neutral-300">
                    Text Color for &ldquo;{phs.find((p) => p.id === selected)?.label}&rdquo;:
                  </span>
                  <div className="flex gap-2">
                    {TXT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updatePh(selected, { textColor: c })}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          phs.find((p) => p.id === selected)?.textColor === c
                            ? "border-amber-400 scale-125 shadow-md"
                            : "border-neutral-700"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* A4 Sheet Layout & Density Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Tickets Per A4 Page
                  </label>
                  <select
                    value={ticketsPerPage}
                    onChange={(e) => setTicketsPerPage(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="auto">Auto Fit (Best Readable Size)</option>
                    <option value="2">2 per Page (Large Half Sheet)</option>
                    <option value="3">3 per Page (Concert Voucher)</option>
                    <option value="4">4 per Page (2×2 Quarter Sheet)</option>
                    <option value="6">6 per Page (2×3 Standard Card)</option>
                    <option value="8">8 per Page (2×4 Pocket Size)</option>
                    <option value="1">1 per Page (Full Page Badge)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Layout Summary
                  </label>
                  {layout ? (
                    <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl px-3 py-2 text-xs flex items-center justify-between text-neutral-300">
                      <div>
                        <span className="font-bold text-white">{layout.cols} × {layout.rows}</span> ={" "}
                        <span className="text-amber-400 font-extrabold">{layout.total}</span> / sheet ({layout.orient})
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {Math.round(layout.tw)}mm × {Math.round(layout.th)}mm
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-500">Calculating layout...</div>
                  )}
                </div>
              </div>

              {/* Total Print Stats Strip */}
              {layout && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between">
                  <span className="text-neutral-300">
                    Selected: <strong className="text-white">{tickets.length} attendees</strong>
                  </span>
                  <span className="text-amber-400 font-bold">
                    Will generate exactly {totalPages} A4 sheet{totalPages !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

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
                  🖨️ Generate & Print {tickets.length} Tickets ({totalPages} A4 Page{totalPages !== 1 ? "s" : ""})
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Progress & Completion ═══ */}
          {step === 3 && (
            <div className="text-center py-10 space-y-6">
              <div className="text-6xl animate-bounce">{isGen ? "⚙️" : "✅"}</div>
              <h3 className="text-xl font-bold text-white">
                {isGen ? "Rendering High-Resolution Tickets..." : "Print Window Opened!"}
              </h3>
              <p className="text-sm text-neutral-400 max-w-md mx-auto">
                {isGen
                  ? `Generating custom barcodes, QR codes, and assembling ${tickets.length} tickets across ${totalPages} A4 sheets...`
                  : "Your browser print preview has opened. You can select your printer or choose 'Save as PDF' to export all tickets."}
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
