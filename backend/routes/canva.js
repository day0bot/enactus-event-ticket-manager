import express from "express";
import CanvaService from "../services/canvaService.js";
import TicketModel from "../models/TicketModel.js";
import authenticationMiddleware from "../middleware/authenticationMiddleware.js";

const router = express.Router();

// Check Canva integration status
router.get("/status", (req, res) => {
  const configured = CanvaService.isConfigured();
  res.status(200).json({
    configured,
    hasToken: Boolean(process.env.CANVA_API_TOKEN),
  });
});

// Programmatically generate and duplicate tickets directly in Canva
router.post("/generate-batch", authenticationMiddleware, async (req, res) => {
  try {
    const { templateId, ticketIds, eventId, codeType = "qr", apiToken } = req.body;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        message: "Canva Template ID is required (e.g. DAxxxxxxx or Canva Design URL)",
      });
    }

    // Clean templateId if a full URL was pasted
    let cleanTemplateId = templateId.trim();
    const urlMatch = cleanTemplateId.match(/design\/([A-Za-z0-9_-]+)/);
    if (urlMatch) {
      cleanTemplateId = urlMatch[1];
    }

    // Fetch tickets to include
    let query = {};
    if (Array.isArray(ticketIds) && ticketIds.length > 0) {
      query._id = { $in: ticketIds };
    } else if (eventId && eventId !== "all") {
      query.event = eventId;
    }

    const tickets = await TicketModel.find(query).populate("event", "title date location");

    if (!tickets || tickets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No tickets found to generate in Canva. Please issue tickets first.",
      });
    }

    const result = await CanvaService.generateCanvaTicketBatch({
      templateId: cleanTemplateId,
      tickets,
      codeType,
      apiToken: apiToken || process.env.CANVA_API_TOKEN,
    });

    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Error in Canva generate-batch:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during Canva batch generation",
      error: error.message,
    });
  }
});

export default router;
