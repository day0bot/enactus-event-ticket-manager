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

const TXT_COLORS = ["#ffffff", "#000000", "#f59e0b", "#14b8a6"];

/* ── Helpers ─────────────────────────────────────────────────── */
function barcodeDataURL(text) {
  try {
    const c = document.createElement("canvas");
    JsBarcode(c, text, { format: "CODE128", width: 2, height: 50, displayValue: false, margin: 2, background: "#ffffff" });
    return c.toDataURL();
  } catch { return ""; }
}

async function qrDataURL(text, size = 300) {
  try {
    return await QRCode.toDataURL(text, { width: size, margin: 1 });
  } catch {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  }
}

function ticketValue(t, type) {
  switch (type) {
    case "attendee_name":  return t.recipientName || "Guest";
    case "ticket_code":    return t.ticketCode || "";
    case "event_title":    return t.event?.title || "Enactus Event";
    case "event_date":     return t.event?.date ? new Date(t.event.date).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}) : "TBA";
    case "event_location": return t.event?.location || "TBA";
    case "ticket_type":    return t.ticketType || "General Admission";
    default: return "";
  }
}

function escHTML(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

function calcA4(tw, th) {
  const aspect = tw / th;
  const M = 5, G = 2;
  const pages = [
    { pageW: 210, pageH: 297, orient: "portrait" },
    { pageW: 297, pageH: 210, orient: "landscape" },
  ];
  let best = { cols: 1, rows: 1, tw: 200, th: 200 / aspect, total: 1, orient: "portrait", pageW: 210, pageH: 297, M, G };
  for (const { pageW, pageH, orient } of pages) {
    const uw = pageW - 2 * M, uh = pageH - 2 * M;
    for (let c = 1; c <= 6; c++) {
      const w = (uw - (c - 1) * G) / c;
      const h = w / aspect;
      const r = Math.floor((uh + G) / (h + G));
      if (r >= 1 && h >= 15 && w >= 25 && c * r > best.total) {
        best = { cols: c, rows: r, tw: w, th: h, total: c * r, orient, pageW, pageH, M, G };
      }
    }
  }
  return best;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

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
  const areaRef = useRef(null);

  useEffect(() => { if (isOpen) { setStep(tplSrc ? 2 : 1); } }, [isOpen]);

  /* ── Upload ──────────────────────────────────────────────── */
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

  const onDrop = useCallback((e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }, [onFile]);
  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }, []);

  /* ── Placeholder CRUD ────────────────────────────────────── */
  const addPh = (type) => {
    const def = PH_TYPES.find((p) => p.type === type);
    const isImg = def?.img;
    setPhs((prev) => [
      ...prev,
      { id: uid(), type, label: def.label, color: def.color, isImg,
        x: 30, y: 30, w: isImg ? 18 : 30, h: isImg ? 25 : 8,
        textColor: "#ffffff" },
    ]);
  };

  const delPh = (id) => { setPhs((p) => p.filter((v) => v.id !== id)); if (selected === id) setSelected(null); };

  const updatePh = (id, patch) => setPhs((p) => p.map((v) => v.id === id ? { ...v, ...patch } : v));

  /* ── Drag / Resize ───────────────────────────────────────── */
  const evPos = (e) => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };

  const startMove = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    const pos = evPos(e);
    const ph = phs.find((p) => p.id === id);
    setDrag({ id, sx: pos.x, sy: pos.y, ox: ph.x, oy: ph.y });
    setSelected(id);
  };

  const startResize = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    const pos = evPos(e);
    const ph = phs.find((p) => p.id === id);
    setResize({ id, sx: pos.x, sy: pos.y, ow: ph.w, oh: ph.h });
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!areaRef.current) return;
      const rect = areaRef.current.getBoundingClientRect();
      const pos = e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };

      if (drag) {
        const dx = ((pos.x - drag.sx) / rect.width) * 100;
        const dy = ((pos.y - drag.sy) / rect.height) * 100;
        setPhs((p) => p.map((v) =>
          v.id === drag.id
            ? { ...v, x: Math.max(0, Math.min(100 - v.w, drag.ox + dx)), y: Math.max(0, Math.min(100 - v.h, drag.oy + dy)) }
            : v
        ));
      }
      if (resize) {
        const dw = ((pos.x - resize.sx) / rect.width) * 100;
        const dh = ((pos.y - resize.sy) / rect.height) * 100;
        setPhs((p) => p.map((v) =>
          v.id === resize.id
            ? { ...v, w: Math.max(5, Math.min(100 - v.x, resize.ow + dw)), h: Math.max(3, Math.min(100 - v.y, resize.oh + dh)) }
            : v
        ));
      }
    };
    const onUp = () => { setDrag(null); setResize(null); };

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

  /* ── Generate & Print ────────────────────────────────────── */
  const layout = tplSize.w ? calcA4(tplSize.w, tplSize.h) : null;
  const totalPages = layout ? Math.ceil(tickets.length / layout.total) : 0;

  const handleGenerate = async () => {
    if (!layout || phs.length === 0) return;
    setIsGen(true);
    setGenProgress(0);
    setStep(3);

    const hasQR = phs.some((p) => p.type === "qr_code");
    const hasBC = phs.some((p) => p.type === "barcode");
    const data = [];
    const BATCH = 20;

    for (let i = 0; i < tickets.length; i += BATCH) {
      const batch = tickets.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        batch.map(async (t) => {
          const d = { ...t, _qr: null, _bc: null };
          if (hasQR) d._qr = await qrDataURL(`${window.location.origin}/verify/${t.ticketCode}`, 300);
          if (hasBC) d._bc = barcodeDataURL(t.ticketCode);
          return d;
        })
      );
      data.push(...batchResults);
      setGenProgress(Math.round((data.length / tickets.length) * 85));
    }

    setGenProgress(92);

    // Build print HTML
    const { cols, tw, th, total: perPage, orient, pageW, pageH, M, G } = layout;
    const pageCount = Math.ceil(data.length / perPage);
    let pages = "";

    for (let p = 0; p < pageCount; p++) {
      const slice = data.slice(p * perPage, (p + 1) * perPage);
      let cards = "";
      for (const t of slice) {
        let overlays = "";
        for (const ph of phs) {
          const l = (ph.x / 100) * tw, top = (ph.y / 100) * th;
          const w = (ph.w / 100) * tw, h = (ph.h / 100) * th;
          if (ph.isImg || ph.type === "qr_code" || ph.type === "barcode") {
            const src = ph.type === "qr_code" ? t._qr : t._bc;
            if (src) overlays += `<div style="position:absolute;left:${l.toFixed(2)}mm;top:${top.toFixed(2)}mm;width:${w.toFixed(2)}mm;height:${h.toFixed(2)}mm;display:flex;align-items:center;justify-content:center;"><img src="${src}" style="max-width:100%;max-height:100%;object-fit:contain;"/></div>`;
          } else {
            const fs = Math.max(1.5, h * 0.55);
            overlays += `<div style="position:absolute;left:${l.toFixed(2)}mm;top:${top.toFixed(2)}mm;width:${w.toFixed(2)}mm;height:${h.toFixed(2)}mm;display:flex;align-items:center;justify-content:center;font-size:${fs.toFixed(1)}mm;font-weight:700;color:${ph.textColor || "#fff"};text-align:center;overflow:hidden;line-height:1.15;word-break:break-word;">${escHTML(ticketValue(t, ph.type))}</div>`;
          }
        }
        cards += `<div class="tk">${overlays}</div>`;
      }
      pages += `<div class="pg">${cards}</div>`;
    }

    const html = `<!DOCTYPE html><html><head><title>Enactus Tickets – Print</title><style>
@page{size:${orient==="landscape"?"A4 landscape":"A4"};margin:${M}mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif}
.pg{display:grid;grid-template-columns:repeat(${cols},${tw.toFixed(2)}mm);gap:${G}mm;justify-content:center;align-content:start;page-break-after:always}
.pg:last-child{page-break-after:auto}
.tk{position:relative;width:${tw.toFixed(2)}mm;height:${th.toFixed(2)}mm;overflow:hidden;background:url("${tplSrc}") center/cover no-repeat}
@media screen{body{background:#1e1e1e;padding:16px}.pg{background:#fff;padding:${M}mm;margin:0 auto 20px;box-shadow:0 4px 24px rgba(0,0,0,.4);border-radius:4px}}
</style></head><body>${pages}<script>window.onload=function(){setTimeout(function(){window.print()},600)}<\/script></body></html>`;

    setGenProgress(100);

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }

    setTimeout(() => setIsGen(false), 500);
  };

  if (!isOpen) return null;

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="bg-neutral-950 border border-amber-500/30 rounded-3xl max-w-3xl w-full shadow-2xl relative my-4">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl font-bold p-1 z-20">✕</button>

        {/* Header */}
        <div className="p-5 pb-0 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl shadow-lg">🖨️</div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white">Ticket Print Designer</h2>
            <p className="text-[11px] text-neutral-400">Upload template → Place fields → Generate A4 print-ready pages</p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-1 px-5 mt-3 mb-1">
          {["Upload", "Design", "Print"].map((l, i) => {
            const n = i + 1; const active = step === n; const done = step > n;
            return (
              <React.Fragment key={l}>
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${active ? "bg-amber-500 text-black scale-110" : done ? "bg-amber-500/20 text-amber-400 border border-amber-500/50" : "bg-neutral-800 text-neutral-500 border border-neutral-700"}`}>
                  {done ? "✓" : n}
                </div>
                {i < 2 && <div className={`flex-1 h-0.5 mx-1 rounded ${done ? "bg-amber-500/40" : "bg-neutral-800"}`} />}
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex px-5 mb-3">
          {["Upload", "Design", "Print"].map((l, i) => (
            <div key={l} className={`flex-1 text-center text-[10px] font-semibold ${step === i + 1 ? "text-amber-400" : "text-neutral-600"}`}>{l}</div>
          ))}
        </div>

        <div className="px-5 pb-5">
          {/* ═══ STEP 1 ═══ */}
          {step === 1 && (
            <div
              className="border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-2xl p-10 text-center cursor-pointer transition-colors"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={() => document.getElementById("tpl-upload").click()}
            >
              <input id="tpl-upload" type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files[0])} />
              <div className="text-5xl mb-4">📄</div>
              <h3 className="text-lg font-bold text-white mb-1">Upload Your Ticket Template</h3>
              <p className="text-sm text-neutral-400 mb-4">Drag & drop a PNG/JPG design, or click to browse</p>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition">
                📁 Choose File
              </div>
              <p className="text-[11px] text-neutral-500 mt-4">The image will be used as the background for every ticket</p>
            </div>
          )}

          {/* ═══ STEP 2 ═══ */}
          {step === 2 && tplSrc && (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-2">Click to add placeholder →</p>
                <div className="flex flex-wrap gap-1.5">
                  {PH_TYPES.map((p) => {
                    const added = phs.some((ph) => ph.type === p.type);
                    return (
                      <button
                        key={p.type}
                        onClick={() => addPh(p.type)}
                        disabled={added && p.img}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition border ${
                          added
                            ? "bg-neutral-800 border-neutral-700 text-neutral-500"
                            : "bg-neutral-800 hover:bg-neutral-700 border-neutral-600 text-white"
                        }`}
                        style={!added ? { borderColor: p.color + "80" } : {}}
                      >
                        <span>{p.icon}</span> {p.label}
                        {added && " ✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Design Canvas */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex justify-center">
                <div
                  ref={areaRef}
                  className="relative select-none"
                  style={{ width: "100%", maxWidth: 520, aspectRatio: `${tplSize.w} / ${tplSize.h}` }}
                  onClick={() => setSelected(null)}
                >
                  <img src={tplSrc} alt="Template" className="w-full h-full object-contain rounded-lg pointer-events-none" draggable={false} />

                  {/* Placeholder overlays */}
                  {phs.map((ph) => {
                    const def = PH_TYPES.find((p) => p.type === ph.type);
                    const isSel = selected === ph.id;
                    return (
                      <div
                        key={ph.id}
                        className="absolute flex items-center justify-center cursor-move group"
                        style={{
                          left: `${ph.x}%`, top: `${ph.y}%`, width: `${ph.w}%`, height: `${ph.h}%`,
                          border: `2px ${isSel ? "solid" : "dashed"} ${ph.color}`,
                          backgroundColor: `${ph.color}22`,
                          borderRadius: 4,
                          zIndex: isSel ? 20 : 10,
                        }}
                        onMouseDown={(e) => startMove(e, ph.id)}
                        onTouchStart={(e) => startMove(e, ph.id)}
                        onClick={(e) => { e.stopPropagation(); setSelected(ph.id); }}
                      >
                        {/* Label */}
                        <span className="text-[9px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.8)] pointer-events-none text-center px-0.5 leading-tight">
                          {ph.isImg ? def?.icon : def?.sample || ph.label}
                        </span>

                        {/* Delete */}
                        <button
                          className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-rose-600 text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                          onMouseDown={(e) => { e.stopPropagation(); delPh(ph.id); }}
                        >✕</button>

                        {/* Resize handle */}
                        <div
                          className="absolute -bottom-1 -right-1 w-3 h-3 rounded-sm cursor-se-resize opacity-60 hover:opacity-100 transition"
                          style={{ backgroundColor: ph.color }}
                          onMouseDown={(e) => startResize(e, ph.id)}
                          onTouchStart={(e) => startResize(e, ph.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected placeholder props */}
              {selected && phs.find((p) => p.id === selected && !p.isImg) && (
                <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2">
                  <span className="text-[11px] font-semibold text-neutral-400">Text Color:</span>
                  {TXT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updatePh(selected, { textColor: c })}
                      className={`w-5 h-5 rounded-full border-2 transition ${
                        phs.find((p) => p.id === selected)?.textColor === c ? "border-amber-400 scale-125" : "border-neutral-600"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}

              {/* Layout info */}
              {layout && (
                <div className="flex items-center justify-between bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs">
                  <div className="text-neutral-400">
                    <span className="font-bold text-white">{layout.cols}×{layout.rows}</span> = <span className="text-amber-400 font-bold">{layout.total}</span> tickets/page
                    {" "}({layout.orient} A4)
                  </div>
                  <div className="text-neutral-400">
                    <span className="text-white font-bold">{tickets.length}</span> tickets → <span className="text-amber-400 font-bold">{totalPages}</span> page{totalPages !== 1 ? "s" : ""}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setTplSrc(null); setStep(1); }} className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-slate-300 font-semibold rounded-xl text-sm transition">
                  ← Change Template
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={phs.length === 0 || tickets.length === 0}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black rounded-xl text-sm transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  🖨️ Generate {tickets.length} Tickets ({totalPages} A4 Page{totalPages !== 1 ? "s" : ""})
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3 ═══ */}
          {step === 3 && (
            <div className="text-center py-8 space-y-6">
              <div className="text-6xl">{isGen ? "⏳" : "✅"}</div>
              <h3 className="text-lg font-bold text-white">
                {isGen ? "Generating Print-Ready Tickets..." : "Tickets Generated!"}
              </h3>
              <p className="text-sm text-neutral-400">
                {isGen
                  ? `Rendering ${tickets.length} tickets across ${totalPages} A4 page${totalPages !== 1 ? "s" : ""}...`
                  : "Your print window should have opened. If not, check your popup blocker."}
              </p>

              {/* Progress */}
              <div className="max-w-xs mx-auto">
                <div className="bg-neutral-800 rounded-full h-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300" style={{ width: `${genProgress}%` }} />
                </div>
                <div className="text-xs text-neutral-400 mt-1.5">{genProgress}%</div>
              </div>

              {!isGen && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <button onClick={handleGenerate} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm transition">
                    🖨️ Re-Generate & Print
                  </button>
                  <button onClick={() => setStep(2)} className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-sm border border-neutral-700 transition">
                    ← Back to Design
                  </button>
                  <button onClick={onClose} className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-sm border border-neutral-700 transition">
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
