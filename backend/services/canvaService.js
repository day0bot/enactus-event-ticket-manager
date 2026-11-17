import dotenv from "dotenv";

dotenv.config();

const CANVA_API_BASE = "https://api.canva.com/v1";

/**
 * Service to interact directly with Canva Connect API (Autofill & Design APIs)
 * Uses native fetch for zero-dependency reliability in all environments (local & Vercel)
 */
export const CanvaService = {
  /**
   * Check if Canva API is configured
   */
  isConfigured: () => {
    return Boolean(process.env.CANVA_API_TOKEN || process.env.CANVA_CLIENT_ID);
  },

  /**
   * Upload an image (QR code or Barcode) to Canva's Asset library
   */
  uploadAssetToCanva: async (token, imageBuffer, fileName = "ticket-code.png") => {
    try {
      const response = await fetch(`${CANVA_API_BASE}/asset-uploads`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Asset-Upload-Metadata": JSON.stringify({
            name_base64: Buffer.from(fileName).toString("base64"),
          }),
        },
        body: imageBuffer,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Canva upload failed with status ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error("Canva asset upload error:", err.message);
      throw err;
    }
  },

  /**
   * Programmatically duplicate a Canva Template and replace placeholders
   * with attendee names, ticket codes, and generated QR/Barcodes
   */
  generateCanvaTicketBatch: async ({ templateId, tickets, codeType = "qr", apiToken }) => {
    const token = apiToken || process.env.CANVA_API_TOKEN;

    if (!token) {
      // If token is missing, return detailed instructions and mock response
      return {
        success: false,
        requiresAuth: true,
        message: "Canva API Token is required to programmatically edit designs in Canva.",
      };
    }

    try {
      // Format dataset for Canva Autofill API
      // Canva Autofill accepts a brand template ID and replaces placeholders
      const dataset = tickets.map((t, index) => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
          `https://event-ticketing-system-main.vercel.app/verify/${t.ticketCode}`
        )}`;
        const barcodeUrl = `https://barcodeapi.org/api/128/${t.ticketCode}`;

        return {
          attendee_name: { type: "text", text: t.recipientName || `Guest #${index + 1}` },
          ticket_code: { type: "text", text: t.ticketCode },
          event_title: { type: "text", text: t.event?.title || "Enactus Event" },
          code_placeholder: {
            type: "image",
            url: codeType === "barcode" ? barcodeUrl : qrUrl,
          },
        };
      });

      // Call Canva Autofill API
      const response = await fetch(`${CANVA_API_BASE}/autofills`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand_template_id: templateId,
          title: `Enactus Tickets - Batch (${tickets.length} attendees)`,
          data: dataset[0], // Primary page
          pages: dataset,   // Duplicated pages for large batches
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Canva Autofill error: ${response.status}`,
          details: data,
        };
      }

      const job = data?.job || data;
      const designId = job.result?.design?.id || job.design?.id;
      const designUrl = job.result?.design?.url || `https://www.canva.com/design/${designId}/edit`;

      return {
        success: true,
        designId,
        designUrl,
        jobId: job.id,
        count: tickets.length,
        message: `Successfully generated ${tickets.length} duplicated ticket pages in Canva!`,
      };
    } catch (err) {
      console.error("Canva Autofill error:", err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  },
};

export default CanvaService;
