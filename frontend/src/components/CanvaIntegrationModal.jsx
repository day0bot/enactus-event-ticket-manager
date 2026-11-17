import React, { useState, useEffect, useCallback } from "react";
import axios from "../config/axios";
import { toast } from "react-toastify";

/**
 * Full Canva OAuth Integration Modal
 * Step 1: Connect to Canva (OAuth 2.0 + PKCE)
 * Step 2: Browse & select a brand template
 * Step 3: Preview placeholders & map fields
 * Step 4: Confirm & generate all tickets → A4 print-ready pages
 */

const TICKET_FIELDS = [
  { value: "", label: "— Skip (don't map) —" },
  { value: "attendee_name", label: "👤 Attendee Name" },
  { value: "ticket_code", label: "🔑 Ticket Code" },
  { value: "event_title", label: "🎪 Event Title" },
  { value: "event_date", label: "📅 Event Date" },
  { value: "event_location", label: "📍 Event Location" },
  { value: "ticket_type", label: "🏷️ Ticket Tier / Type" },
  { value: "qr_code", label: "📱 QR Code (image)" },
  { value: "barcode", label: "📊 Barcode / Code 128 (image)" },
  { value: "code_auto", label: "🔄 Auto Code (uses selected format)" },
];

export default function CanvaIntegrationModal({
  isOpen,
  onClose,
  tickets = [],
  events = [],
  selectedEventId = "all",
}) {
  // Connection state
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  // Wizard step: 1=connect, 2=select template, 3=map fields, 4=generate, 5=done
  const [step, setStep] = useState(1);

  // Template browsing
  const [designs, setDesigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  const [browseTab, setBrowseTab] = useState("templates"); // "templates" | "designs"
  const [continuation, setContinuation] = useState(null);

  // Selected template
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Placeholder mapping
  const [templateFields, setTemplateFields] = useState({});
  const [fieldMapping, setFieldMapping] = useState({});
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  // Generation
  const [codeType, setCodeType] = useState("qr");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Check connection status on open
  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  const checkConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const res = await axios.get("/canva/connection");
      setIsConnected(res.data.connected);
      setIsConfigured(res.data.configured);
      if (res.data.connected) {
        setStep(2);
      } else {
        setStep(1);
      }
    } catch {
      // Check if Canva is configured at all (public endpoint)
      try {
        const statusRes = await axios.get("/canva/status");
        setIsConfigured(statusRes.data.configured);
      } catch {
        setIsConfigured(false);
      }
      setStep(1);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  // ─── Step 1: OAuth Connect ──────────────────────────────────────
  const handleConnect = async () => {
    try {
      const redirectUri = `${window.location.origin}/canva/callback`;
      const res = await axios.post("/canva/auth/start", { redirectUri });

      if (res.data.success && res.data.authUrl) {
        // Store state for callback verification
        sessionStorage.setItem("canva_oauth_state", res.data.state);
        sessionStorage.setItem("canva_redirect_uri", redirectUri);

        // Open Canva auth in a popup
        const popup = window.open(
          res.data.authUrl,
          "canva_oauth",
          "width=600,height=700,scrollbars=yes,resizable=yes"
        );

        // Listen for the callback
        const handleMessage = async (event) => {
          if (event.data?.type === "canva_oauth_callback") {
            window.removeEventListener("message", handleMessage);
            popup?.close();

            const { code, state } = event.data;
            if (state !== sessionStorage.getItem("canva_oauth_state")) {
              toast.error("OAuth state mismatch. Please try again.");
              return;
            }

            try {
              const callbackRes = await axios.post("/canva/auth/callback", {
                code,
                state,
                redirectUri: sessionStorage.getItem("canva_redirect_uri"),
              });

              if (callbackRes.data.success) {
                setIsConnected(true);
                setStep(2);
                toast.success("🎨 Connected to Canva successfully!");
              }
            } catch (err) {
              toast.error("Failed to complete Canva connection: " + (err.response?.data?.message || err.message));
            }
          }
        };

        window.addEventListener("message", handleMessage);

        // Also poll for popup closure
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            // Check if we got connected
            setTimeout(() => checkConnection(), 1000);
          }
        }, 1000);
      }
    } catch (err) {
      toast.error("Failed to start Canva connection: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.post("/canva/disconnect");
      setIsConnected(false);
      setStep(1);
      setSelectedTemplate(null);
      setTemplateFields({});
      setFieldMapping({});
      setGenerationResult(null);
      toast.info("Disconnected from Canva");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  // ─── Step 2: Browse Templates & Designs ──────────────────────────
  const loadTemplates = async () => {
    setIsLoadingDesigns(true);
    try {
      const res = await axios.get("/canva/templates");
      if (res.data.success) {
        setTemplates(res.data.templates || []);
        setContinuation(res.data.continuation);
      }
    } catch (err) {
      if (err.response?.data?.needsAuth) {
        setIsConnected(false);
        setStep(1);
        toast.warning("Canva session expired. Please reconnect.");
      } else {
        toast.error("Failed to load templates: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setIsLoadingDesigns(false);
    }
  };

  const loadDesigns = async (query = "") => {
    setIsLoadingDesigns(true);
    try {
      const params = query ? `?query=${encodeURIComponent(query)}` : "";
      const res = await axios.get(`/canva/designs${params}`);
      if (res.data.success) {
        setDesigns(res.data.designs || []);
        setContinuation(res.data.continuation);
      }
    } catch (err) {
      if (err.response?.data?.needsAuth) {
        setIsConnected(false);
        setStep(1);
      } else {
        toast.error("Failed to load designs: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setIsLoadingDesigns(false);
    }
  };

  useEffect(() => {
    if (step === 2 && isConnected) {
      if (browseTab === "templates") {
        loadTemplates();
      } else {
        loadDesigns(searchQuery);
      }
    }
  }, [step, isConnected, browseTab]);

  const handleSearchDesigns = (e) => {
    e.preventDefault();
    loadDesigns(searchQuery);
  };

  const handleSelectTemplate = async (template) => {
    setSelectedTemplate(template);
    setIsLoadingFields(true);
    setStep(3);

    try {
      // Try to get dataset (placeholder fields) for brand templates
      const res = await axios.get(`/canva/templates/${template.id}/dataset`);
      if (res.data.success && res.data.fields) {
        setTemplateFields(res.data.fields);
        // Auto-map fields with smart matching
        const autoMapping = {};
        for (const [fieldName, fieldInfo] of Object.entries(res.data.fields)) {
          const lower = fieldName.toLowerCase();
          if (lower.includes("name") || lower.includes("attendee")) {
            autoMapping[fieldName] = "attendee_name";
          } else if (lower.includes("code") && !lower.includes("qr") && !lower.includes("bar")) {
            autoMapping[fieldName] = "ticket_code";
          } else if (lower.includes("event") && lower.includes("title")) {
            autoMapping[fieldName] = "event_title";
          } else if (lower.includes("date")) {
            autoMapping[fieldName] = "event_date";
          } else if (lower.includes("location") || lower.includes("venue")) {
            autoMapping[fieldName] = "event_location";
          } else if (lower.includes("type") || lower.includes("tier")) {
            autoMapping[fieldName] = "ticket_type";
          } else if (lower.includes("qr")) {
            autoMapping[fieldName] = "qr_code";
          } else if (lower.includes("barcode") || lower.includes("bar_code")) {
            autoMapping[fieldName] = "barcode";
          } else if (fieldInfo.type === "image") {
            autoMapping[fieldName] = "code_auto";
          }
        }
        setFieldMapping(autoMapping);
      }
    } catch (err) {
      // If dataset endpoint fails, provide manual field entry
      console.warn("Could not load template fields:", err.message);
      // Provide default set of common placeholders
      setTemplateFields({
        attendee_name: { type: "text", currentValue: "{{Attendee Name}}" },
        ticket_code: { type: "text", currentValue: "{{Ticket Code}}" },
        event_title: { type: "text", currentValue: "{{Event Title}}" },
        code_placeholder: { type: "image", currentValue: "placeholder" },
      });
      setFieldMapping({
        attendee_name: "attendee_name",
        ticket_code: "ticket_code",
        event_title: "event_title",
        code_placeholder: "code_auto",
      });
    } finally {
      setIsLoadingFields(false);
    }
  };

  // ─── Step 4: Generate ────────────────────────────────────────────
  const handleGenerate = async () => {
    // Filter out unmapped fields
    const activeMappings = {};
    for (const [key, val] of Object.entries(fieldMapping)) {
      if (val) activeMappings[key] = val;
    }

    if (Object.keys(activeMappings).length === 0) {
      toast.error("Please map at least one placeholder field to ticket data.");
      return;
    }

    setStep(4);
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationResult(null);

    try {
      const payload = {
        templateId: selectedTemplate.id,
        eventId: selectedEventId !== "all" ? selectedEventId : undefined,
        ticketIds: tickets.map((t) => t._id),
        fieldMapping: activeMappings,
        codeType,
      };

      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setGenerationProgress((p) => Math.min(p + Math.random() * 15, 90));
      }, 800);

      const res = await axios.post("/canva/generate-batch", payload);

      clearInterval(progressInterval);
      setGenerationProgress(100);

      setGenerationResult(res.data);

      if (res.data.success) {
        toast.success(`🎨 Generated ${res.data.results?.length || 0} ticket designs in Canva!`);
        setStep(5);
      } else {
        toast.error(res.data.message || "Generation failed");
      }
    } catch (err) {
      toast.error("Generation failed: " + (err.response?.data?.message || err.message));
      setGenerationResult({
        success: false,
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const ticketCount = tickets.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-neutral-950 border border-teal-500/40 rounded-3xl max-w-2xl w-full shadow-2xl relative my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white text-xl font-bold p-1 z-10"
        >
          ✕
        </button>

        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-lg">
              🎨
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Canva Ticket Designer</h2>
              <p className="text-xs text-neutral-400">
                Connect → Select Template → Map Placeholders → Generate A4 Print-Ready Tickets
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-1 mt-4 mb-2">
            {["Connect", "Template", "Map Fields", "Generate", "Done"].map((label, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={label} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
                    isActive ? "bg-teal-500 text-black scale-110" :
                    isDone ? "bg-teal-500/20 text-teal-400 border border-teal-500/50" :
                    "bg-neutral-800 text-neutral-500 border border-neutral-700"
                  }`}>
                    {isDone ? "✓" : stepNum}
                  </div>
                  {i < 4 && (
                    <div className={`flex-1 h-0.5 mx-1 rounded ${isDone ? "bg-teal-500/40" : "bg-neutral-800"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-1 mb-4">
            {["Connect", "Template", "Map Fields", "Generate", "Done"].map((label, i) => (
              <div key={label} className={`flex-1 text-center text-[10px] font-semibold ${step === i + 1 ? "text-teal-400" : "text-neutral-600"}`}>
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Loading state */}
          {isCheckingConnection && (
            <div className="flex items-center justify-center py-12 text-neutral-400">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent mr-3" />
              Checking Canva connection...
            </div>
          )}

          {/* ═══ STEP 1: Connect to Canva ═══ */}
          {!isCheckingConnection && step === 1 && (
            <div className="text-center py-6">
              {!isConfigured ? (
                <div className="space-y-4">
                  <div className="text-6xl mb-4">⚙️</div>
                  <h3 className="text-lg font-bold text-white">Canva Integration Not Configured</h3>
                  <p className="text-sm text-neutral-400 max-w-md mx-auto">
                    To enable Canva integration, add your Canva Connect API credentials to your server environment:
                  </p>
                  <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-left font-mono text-xs text-teal-400 max-w-sm mx-auto">
                    <div>CANVA_CLIENT_ID=your_client_id</div>
                    <div>CANVA_CLIENT_SECRET=your_secret</div>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Get your credentials at{" "}
                    <a href="https://www.canva.com/developers/" target="_blank" rel="noreferrer" className="text-teal-400 underline">
                      canva.com/developers
                    </a>
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-6xl mb-4">🔗</div>
                  <h3 className="text-lg font-bold text-white">Connect Your Canva Account</h3>
                  <p className="text-sm text-neutral-400 max-w-md mx-auto">
                    Sign in with Canva to browse your templates, map ticket placeholders, and generate print-ready A4 ticket pages automatically.
                  </p>

                  <button
                    onClick={handleConnect}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-black rounded-2xl text-base transition-all shadow-xl active:scale-95"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    Connect to Canva
                  </button>

                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 max-w-sm mx-auto text-xs text-neutral-400 text-left space-y-1">
                    <div className="font-semibold text-neutral-300 mb-2">What this will do:</div>
                    <div>✓ Sign in securely with your Canva account</div>
                    <div>✓ Browse your brand templates</div>
                    <div>✓ Auto-map ticket data to template placeholders</div>
                    <div>✓ Generate {ticketCount} ticket pages in bulk</div>
                    <div>✓ Export as print-ready A4 PDF</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 2: Browse & Select Template ═══ */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Connected indicator */}
              <div className="flex items-center justify-between bg-teal-950/30 border border-teal-500/30 rounded-xl px-4 py-2">
                <div className="flex items-center gap-2 text-sm text-teal-300">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  Connected to Canva
                </div>
                <button
                  onClick={handleDisconnect}
                  className="text-xs text-neutral-400 hover:text-rose-400 font-semibold transition"
                >
                  Disconnect
                </button>
              </div>

              {/* Tab switcher */}
              <div className="flex gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                <button
                  onClick={() => setBrowseTab("templates")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition ${
                    browseTab === "templates" ? "bg-teal-500 text-black" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  🏷️ Brand Templates
                </button>
                <button
                  onClick={() => setBrowseTab("designs")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition ${
                    browseTab === "designs" ? "bg-teal-500 text-black" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  🎨 My Designs
                </button>
              </div>

              {/* Search (designs only) */}
              {browseTab === "designs" && (
                <form onSubmit={handleSearchDesigns} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search your designs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl border border-neutral-700 text-sm transition"
                  >
                    Search
                  </button>
                </form>
              )}

              {/* Template / Design Grid */}
              {isLoadingDesigns ? (
                <div className="flex items-center justify-center py-12 text-neutral-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent mr-3" />
                  Loading your {browseTab}...
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                    {(browseTab === "templates" ? templates : designs).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTemplate(item)}
                        className="group bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-teal-500/60 rounded-xl p-2 text-left transition-all"
                      >
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-28 object-cover rounded-lg bg-neutral-800 mb-2"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-28 rounded-lg bg-neutral-800 mb-2 flex items-center justify-center text-neutral-600 text-3xl">
                            🎨
                          </div>
                        )}
                        <div className="text-xs font-semibold text-white truncate group-hover:text-teal-300 transition">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono truncate">
                          {item.id}
                        </div>
                      </button>
                    ))}
                  </div>

                  {(browseTab === "templates" ? templates : designs).length === 0 && (
                    <div className="text-center py-8 text-neutral-400 text-sm">
                      <div className="text-4xl mb-3">📂</div>
                      {browseTab === "templates"
                        ? "No brand templates found. Create a brand template in Canva first."
                        : "No designs found. Try a different search term."}
                    </div>
                  )}

                  {/* Manual template ID entry */}
                  <div className="mt-4 pt-4 border-t border-neutral-800">
                    <p className="text-xs text-neutral-400 mb-2">Or enter a template ID manually:</p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const id = e.target.elements.manualId.value.trim();
                        if (id) {
                          // Extract ID from URL if pasted
                          const match = id.match(/design\/([A-Za-z0-9_-]+)/);
                          handleSelectTemplate({ id: match ? match[1] : id, title: "Custom Template" });
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        name="manualId"
                        type="text"
                        placeholder="Template ID or Canva URL..."
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition"
                      >
                        Use
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 3: Map Placeholder Fields ═══ */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Selected template header */}
              <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-700 rounded-xl p-3">
                {selectedTemplate?.thumbnail ? (
                  <img
                    src={selectedTemplate.thumbnail}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover bg-neutral-800"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-neutral-800 flex items-center justify-center text-2xl">🎨</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{selectedTemplate?.title}</div>
                  <div className="text-[10px] text-neutral-400 font-mono">{selectedTemplate?.id}</div>
                </div>
                <button
                  onClick={() => { setStep(2); setSelectedTemplate(null); }}
                  className="text-xs text-neutral-400 hover:text-white font-semibold px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition"
                >
                  Change
                </button>
              </div>

              <div className="bg-teal-950/20 border border-teal-500/20 rounded-xl p-3">
                <h3 className="text-sm font-bold text-teal-300 mb-1">Map Template Placeholders</h3>
                <p className="text-[11px] text-neutral-400">
                  Map each placeholder in your Canva template to the corresponding ticket data field.
                  Image fields (like QR code / barcode) will be auto-generated for each ticket.
                </p>
              </div>

              {isLoadingFields ? (
                <div className="flex items-center justify-center py-8 text-neutral-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-500 border-t-transparent mr-3" />
                  Loading template placeholders...
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {Object.entries(templateFields).map(([fieldName, fieldInfo]) => (
                    <div key={fieldName} className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${fieldInfo.type === "image" ? "bg-purple-400" : "bg-teal-400"}`} />
                          {fieldName}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {fieldInfo.type === "image" ? "📷 Image placeholder" : "📝 Text placeholder"}
                          {fieldInfo.currentValue && ` — "${String(fieldInfo.currentValue).substring(0, 30)}"`}
                        </div>
                      </div>
                      <select
                        value={fieldMapping[fieldName] || ""}
                        onChange={(e) =>
                          setFieldMapping((prev) => ({ ...prev, [fieldName]: e.target.value }))
                        }
                        className="bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 min-w-[160px]"
                      >
                        {TICKET_FIELDS
                          .filter((f) => {
                            // For image placeholders, show image-compatible options
                            if (fieldInfo.type === "image") {
                              return !f.value || ["qr_code", "barcode", "code_auto"].includes(f.value);
                            }
                            // For text placeholders, show text options
                            return !f.value || !["qr_code", "barcode", "code_auto"].includes(f.value);
                          })
                          .map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Code format selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Code Format
                  </label>
                  <select
                    value={codeType}
                    onChange={(e) => setCodeType(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="qr">QR Code (2D)</option>
                    <option value="barcode">Barcode (1D Code 128)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    Tickets to Generate
                  </label>
                  <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 text-sm font-bold text-amber-400 flex items-center justify-between">
                    <span>{ticketCount} tickets</span>
                    <span className="text-[10px] text-neutral-500 font-normal">1 page each</span>
                  </div>
                </div>
              </div>

              {/* Generate / Back buttons */}
              <div className="flex gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => { setStep(2); setSelectedTemplate(null); }}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-slate-300 font-semibold rounded-xl transition text-sm"
                >
                  ← Back
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={Object.values(fieldMapping).every((v) => !v)}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-black rounded-xl text-sm transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  ⚡ Generate {ticketCount} Tickets in Canva
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: Generating ═══ */}
          {step === 4 && (
            <div className="text-center py-8 space-y-6">
              <div className="text-6xl animate-pulse">🎨</div>
              <h3 className="text-lg font-bold text-white">
                {isGenerating ? "Generating Tickets in Canva..." : "Generation Complete"}
              </h3>
              <p className="text-sm text-neutral-400">
                Creating {ticketCount} ticket designs with auto-filled placeholders
              </p>

              {/* Progress bar */}
              <div className="max-w-sm mx-auto">
                <div className="bg-neutral-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <div className="text-xs text-neutral-400 mt-2">{Math.round(generationProgress)}%</div>
              </div>

              {generationResult && !generationResult.success && (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-4 text-sm text-rose-200">
                  <div className="font-bold mb-1">❌ Error</div>
                  <div>{generationResult.message}</div>
                  <button
                    onClick={() => setStep(3)}
                    className="mt-3 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-xl text-xs transition"
                  >
                    ← Go Back & Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 5: Done ═══ */}
          {step === 5 && generationResult && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="text-6xl mb-3">✅</div>
                <h3 className="text-lg font-bold text-white mb-1">Tickets Generated Successfully!</h3>
                <p className="text-sm text-neutral-400">
                  Created {generationResult.results?.length || 0} ticket designs in Canva
                  {generationResult.errors?.length > 0 && (
                    <span className="text-amber-400"> ({generationResult.errors.length} errors)</span>
                  )}
                </p>
              </div>

              {/* Results summary */}
              {generationResult.results?.length > 0 && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-neutral-400 border-b border-neutral-800">
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Attendee</th>
                        <th className="py-2 px-3">Code</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {generationResult.results.map((r, i) => (
                        <tr key={i} className="hover:bg-neutral-800/50">
                          <td className="py-2 px-3 text-neutral-500">{i + 1}</td>
                          <td className="py-2 px-3 text-white font-semibold">{r.recipientName || "Guest"}</td>
                          <td className="py-2 px-3 text-amber-400 font-mono">{r.ticketCode}</td>
                          <td className="py-2 px-3">
                            <span className="text-emerald-400 font-semibold">{r.status || "created"}</span>
                          </td>
                          <td className="py-2 px-3">
                            {r.editUrl && (
                              <a
                                href={r.editUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-teal-400 hover:text-teal-300 font-semibold underline"
                              >
                                Open in Canva
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Error list */}
              {generationResult.errors?.length > 0 && (
                <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300">
                  <div className="font-bold mb-1">⚠️ Errors ({generationResult.errors.length})</div>
                  {generationResult.errors.slice(0, 5).map((e, i) => (
                    <div key={i} className="text-rose-400">{e.ticketCode}: {e.error}</div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-800">
                <button
                  onClick={() => {
                    setStep(2);
                    setSelectedTemplate(null);
                    setGenerationResult(null);
                  }}
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-sm transition"
                >
                  🔄 Generate Another Batch
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-sm border border-neutral-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
