import express from "express";
import crypto from "crypto";
import CanvaService from "../services/canvaService.js";
import TicketModel from "../models/TicketModel.js";
import authenticationMiddleware from "../middleware/authenticationMiddleware.js";

const router = express.Router();

// In-memory PKCE store keyed by state parameter (short-lived)
const pkceStore = new Map();

// ─── Public: Check if Canva OAuth is configured ───────────────────────
router.get("/status", (req, res) => {
  res.json({
    configured: CanvaService.isConfigured(),
    hasClientId: Boolean(process.env.CANVA_CLIENT_ID),
  });
});

// ─── Protected routes below ───────────────────────────────────────────
router.use(authenticationMiddleware);

// ─── Check if the current user is connected to Canva ──────────────────
router.get("/connection", (req, res) => {
  const userId = req.user?.userId || req.user?._id;
  res.json({
    connected: CanvaService.isConnected(userId),
    configured: CanvaService.isConfigured(),
  });
});

// ─── Start OAuth flow: generate auth URL ──────────────────────────────
router.post("/auth/start", (req, res) => {
  try {
    if (!CanvaService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: "Canva integration is not configured. Set CANVA_CLIENT_ID and CANVA_CLIENT_SECRET in your environment.",
      });
    }

    const userId = req.user?.userId || req.user?._id;
    const { redirectUri } = req.body;

    if (!redirectUri) {
      return res.status(400).json({ success: false, message: "redirectUri is required" });
    }

    // Generate PKCE pair and state
    const { verifier, challenge } = CanvaService.generatePKCE();
    const state = crypto.randomBytes(16).toString("hex");

    // Store verifier temporarily (expires in 10 min)
    pkceStore.set(state, {
      verifier,
      userId,
      redirectUri,
      createdAt: Date.now(),
    });

    // Clean up old entries
    for (const [key, val] of pkceStore.entries()) {
      if (Date.now() - val.createdAt > 600000) pkceStore.delete(key);
    }

    const authUrl = CanvaService.getAuthUrl({
      redirectUri,
      state,
      codeChallenge: challenge,
    });

    res.json({ success: true, authUrl, state });
  } catch (err) {
    console.error("Canva auth start error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── OAuth callback: exchange code for tokens ─────────────────────────
router.post("/auth/callback", async (req, res) => {
  try {
    const { code, state, redirectUri } = req.body;

    if (!code || !state) {
      return res.status(400).json({ success: false, message: "code and state are required" });
    }

    const pkce = pkceStore.get(state);
    if (!pkce) {
      return res.status(400).json({ success: false, message: "Invalid or expired state parameter. Please retry the connection." });
    }

    pkceStore.delete(state);

    const tokens = await CanvaService.exchangeCode({
      code,
      redirectUri: redirectUri || pkce.redirectUri,
      codeVerifier: pkce.verifier,
    });

    // Store tokens for the user
    CanvaService.storeTokens(pkce.userId, tokens);

    res.json({
      success: true,
      message: "Successfully connected to Canva!",
      connected: true,
    });
  } catch (err) {
    console.error("Canva auth callback error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Disconnect from Canva ────────────────────────────────────────────
router.post("/disconnect", (req, res) => {
  const userId = req.user?.userId || req.user?._id;
  CanvaService.disconnect(userId);
  res.json({ success: true, connected: false, message: "Disconnected from Canva." });
});

// ─── List user's designs ──────────────────────────────────────────────
router.get("/designs", async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const accessToken = await CanvaService.getValidToken(userId);

    if (!accessToken) {
      return res.status(401).json({ success: false, message: "Not connected to Canva. Please connect first.", needsAuth: true });
    }

    const { query, continuation } = req.query;
    const result = await CanvaService.listDesigns(accessToken, { query, continuation });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Canva list designs error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── List brand templates ─────────────────────────────────────────────
router.get("/templates", async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const accessToken = await CanvaService.getValidToken(userId);

    if (!accessToken) {
      return res.status(401).json({ success: false, message: "Not connected to Canva.", needsAuth: true });
    }

    const { continuation } = req.query;
    const result = await CanvaService.listBrandTemplates(accessToken, { continuation });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Canva list templates error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Get design details ───────────────────────────────────────────────
router.get("/designs/:designId", async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const accessToken = await CanvaService.getValidToken(userId);

    if (!accessToken) {
      return res.status(401).json({ success: false, needsAuth: true });
    }

    const details = await CanvaService.getDesignDetails(accessToken, req.params.designId);
    res.json({ success: true, design: details });
  } catch (err) {
    console.error("Canva design details error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Get brand template dataset (placeholder fields) ──────────────────
router.get("/templates/:templateId/dataset", async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const accessToken = await CanvaService.getValidToken(userId);

    if (!accessToken) {
      return res.status(401).json({ success: false, needsAuth: true });
    }

    const dataset = await CanvaService.getBrandTemplateDataset(accessToken, req.params.templateId);
    res.json({ success: true, ...dataset });
  } catch (err) {
    console.error("Canva template dataset error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Generate batch tickets via autofill ──────────────────────────────
router.post("/generate-batch", async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const accessToken = await CanvaService.getValidToken(userId);

    if (!accessToken) {
      return res.status(401).json({ success: false, message: "Not connected to Canva.", needsAuth: true });
    }

    const { templateId, ticketIds, eventId, fieldMapping, codeType = "qr" } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, message: "templateId is required" });
    }

    if (!fieldMapping || Object.keys(fieldMapping).length === 0) {
      return res.status(400).json({ success: false, message: "fieldMapping is required. Map template placeholders to ticket data." });
    }

    // Fetch tickets
    let query = {};
    if (Array.isArray(ticketIds) && ticketIds.length > 0) {
      query._id = { $in: ticketIds };
    } else if (eventId && eventId !== "all") {
      query.event = eventId;
    }

    const tickets = await TicketModel.find(query).populate("event", "title date location");

    if (!tickets || tickets.length === 0) {
      return res.status(400).json({ success: false, message: "No tickets found. Issue tickets first." });
    }

    // Determine base URL for QR code verification links
    const baseUrl = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "https://enactus-ticket-manager.vercel.app";

    const result = await CanvaService.generateBatchTickets({
      accessToken,
      templateId,
      tickets,
      fieldMapping,
      codeType,
      baseUrl,
    });

    res.json({
      success: true,
      message: `Generated ${result.results.length} ticket designs in Canva (${result.errors.length} errors)`,
      ...result,
    });
  } catch (err) {
    console.error("Canva batch generate error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Export design as PDF ─────────────────────────────────────────────
router.post("/export-pdf", async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const accessToken = await CanvaService.getValidToken(userId);

    if (!accessToken) {
      return res.status(401).json({ success: false, needsAuth: true });
    }

    const { designId } = req.body;
    if (!designId) {
      return res.status(400).json({ success: false, message: "designId is required" });
    }

    const exportJob = await CanvaService.exportDesignPdf(accessToken, designId);
    res.json({ success: true, export: exportJob });
  } catch (err) {
    console.error("Canva export error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Check export job status ──────────────────────────────────────────
router.get("/export/:exportId", async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?._id;
    const accessToken = await CanvaService.getValidToken(userId);

    if (!accessToken) {
      return res.status(401).json({ success: false, needsAuth: true });
    }

    const exportJob = await CanvaService.getExportJob(accessToken, req.params.exportId);
    res.json({ success: true, export: exportJob });
  } catch (err) {
    console.error("Canva export status error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
