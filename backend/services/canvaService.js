import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const CANVA_API_BASE = "https://api.canva.com/rest/v1";
const CANVA_AUTH_BASE = "https://www.canva.com/api/oauth/authorize";
const CANVA_TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";

// In-memory token store keyed by userId (replace with DB in production if needed)
const tokenStore = new Map();

/**
 * Canva Connect API Integration Service
 * Full OAuth 2.0 + PKCE flow, design browsing, autofill batch generation
 */
export const CanvaService = {
  /**
   * Check if Canva OAuth is configured (client ID + secret present)
   */
  isConfigured: () => {
    return Boolean(process.env.CANVA_CLIENT_ID && process.env.CANVA_CLIENT_SECRET);
  },

  /**
   * Generate a PKCE code verifier + challenge pair
   */
  generatePKCE: () => {
    const verifier = crypto.randomBytes(32).toString("base64url");
    const challenge = crypto
      .createHash("sha256")
      .update(verifier)
      .digest("base64url");
    return { verifier, challenge };
  },

  /**
   * Build the Canva OAuth authorization URL
   */
  getAuthUrl: ({ redirectUri, state, codeChallenge }) => {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.CANVA_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: "design:content:read design:content:write design:meta:read brandtemplate:content:read brandtemplate:meta:read asset:read asset:write",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `${CANVA_AUTH_BASE}?${params.toString()}`;
  },

  /**
   * Exchange authorization code for access + refresh tokens
   */
  exchangeCode: async ({ code, redirectUri, codeVerifier }) => {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const credentials = Buffer.from(
      `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(CANVA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: body.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Canva token exchange error:", data);
      throw new Error(data.error_description || data.message || "Token exchange failed");
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scope: data.scope,
    };
  },

  /**
   * Refresh an expired access token
   */
  refreshAccessToken: async (refreshToken) => {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const credentials = Buffer.from(
      `${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(CANVA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: body.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error_description || "Token refresh failed");
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    };
  },

  /**
   * Store tokens for a user
   */
  storeTokens: (userId, tokens) => {
    tokenStore.set(userId, {
      ...tokens,
      storedAt: Date.now(),
    });
  },

  /**
   * Get a valid access token for a user, refreshing if expired
   */
  getValidToken: async (userId) => {
    const stored = tokenStore.get(userId);
    if (!stored) return null;

    const elapsed = (Date.now() - stored.storedAt) / 1000;
    if (elapsed < (stored.expiresIn || 3600) - 60) {
      return stored.accessToken;
    }

    // Token expired, try refresh
    if (stored.refreshToken) {
      try {
        const refreshed = await CanvaService.refreshAccessToken(stored.refreshToken);
        CanvaService.storeTokens(userId, refreshed);
        return refreshed.accessToken;
      } catch (err) {
        console.error("Token refresh failed:", err.message);
        tokenStore.delete(userId);
        return null;
      }
    }

    tokenStore.delete(userId);
    return null;
  },

  /**
   * Check if a user has a stored Canva connection
   */
  isConnected: (userId) => {
    return tokenStore.has(userId);
  },

  /**
   * Disconnect / revoke Canva tokens for a user
   */
  disconnect: (userId) => {
    tokenStore.delete(userId);
  },

  /**
   * List user's Canva designs (for the design picker)
   */
  listDesigns: async (accessToken, { query, continuation } = {}) => {
    const params = new URLSearchParams({ ownership: "owned" });
    if (query) params.set("query", query);
    if (continuation) params.set("continuation", continuation);

    const response = await fetch(`${CANVA_API_BASE}/designs?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Failed to list designs: ${response.status}`);
    }

    return {
      designs: (data.items || []).map((d) => ({
        id: d.id,
        title: d.title || "Untitled",
        thumbnail: d.thumbnail?.url || null,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        urls: d.urls || {},
      })),
      continuation: data.continuation || null,
    };
  },

  /**
   * List user's brand templates
   */
  listBrandTemplates: async (accessToken, { continuation } = {}) => {
    const params = new URLSearchParams();
    if (continuation) params.set("continuation", continuation);

    const url = `${CANVA_API_BASE}/brand-templates${params.toString() ? "?" + params.toString() : ""}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Failed to list brand templates: ${response.status}`);
    }

    return {
      templates: (data.items || []).map((t) => ({
        id: t.id,
        title: t.title || "Untitled Template",
        thumbnail: t.thumbnail?.url || null,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
      continuation: data.continuation || null,
    };
  },

  /**
   * Get design/template details to show available data fields (placeholders)
   */
  getDesignDetails: async (accessToken, designId) => {
    const response = await fetch(`${CANVA_API_BASE}/designs/${designId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Failed to get design: ${response.status}`);
    }

    return {
      id: data.design?.id || designId,
      title: data.design?.title || "Untitled",
      thumbnail: data.design?.thumbnail?.url || null,
      pageCount: data.design?.page_count || 1,
      urls: data.design?.urls || {},
    };
  },

  /**
   * Get brand template dataset definition (shows available placeholder fields)
   */
  getBrandTemplateDataset: async (accessToken, templateId) => {
    const response = await fetch(`${CANVA_API_BASE}/brand-templates/${templateId}/dataset`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Failed to get template dataset: ${response.status}`);
    }

    // Extract placeholder field names and types
    const fields = {};
    if (data.dataset) {
      for (const [key, value] of Object.entries(data.dataset)) {
        fields[key] = {
          type: value.type, // "text" or "image"
          currentValue: value.type === "text" ? value.text : value.url,
        };
      }
    }

    return { templateId, fields };
  },

  /**
   * Create autofill job: generate one design per ticket using brand template
   */
  createAutofillJob: async (accessToken, { templateId, title, data: autofillData }) => {
    const response = await fetch(`${CANVA_API_BASE}/autofills`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        brand_template_id: templateId,
        title,
        data: autofillData,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Autofill failed: ${response.status}`);
    }

    return data;
  },

  /**
   * Check autofill job status
   */
  getAutofillJob: async (accessToken, jobId) => {
    const response = await fetch(`${CANVA_API_BASE}/autofills/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Failed to get autofill status: ${response.status}`);
    }

    return data;
  },

  /**
   * Export a design as PDF for A4 printing
   */
  exportDesignPdf: async (accessToken, designId) => {
    // Start export job
    const startResp = await fetch(`${CANVA_API_BASE}/exports`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        design_id: designId,
        format: { type: "pdf", size: "a4" },
      }),
    });

    const startData = await startResp.json();
    if (!startResp.ok) {
      throw new Error(startData.message || `Export start failed: ${startResp.status}`);
    }

    return startData;
  },

  /**
   * Check export job status
   */
  getExportJob: async (accessToken, exportId) => {
    const response = await fetch(`${CANVA_API_BASE}/exports/${exportId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Failed to get export status: ${response.status}`);
    }

    return data;
  },

  /**
   * Full batch generation pipeline:
   * For each ticket, creates an autofill job against the brand template
   * Returns array of created design IDs
   */
  generateBatchTickets: async ({
    accessToken,
    templateId,
    tickets,
    fieldMapping,
    codeType = "qr",
    baseUrl = "",
  }) => {
    const results = [];
    const errors = [];

    // Process in small batches to avoid rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
      const batch = tickets.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (ticket, batchIdx) => {
        const idx = i + batchIdx;
        try {
          // Build autofill data based on field mapping
          const autofillData = {};

          for (const [fieldName, mapping] of Object.entries(fieldMapping)) {
            if (mapping === "attendee_name") {
              autofillData[fieldName] = { type: "text", text: ticket.recipientName || `Guest #${idx + 1}` };
            } else if (mapping === "ticket_code") {
              autofillData[fieldName] = { type: "text", text: ticket.ticketCode };
            } else if (mapping === "event_title") {
              autofillData[fieldName] = { type: "text", text: ticket.event?.title || "Enactus Event" };
            } else if (mapping === "event_date") {
              autofillData[fieldName] = {
                type: "text",
                text: ticket.event?.date
                  ? new Date(ticket.event.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                  : "TBA",
              };
            } else if (mapping === "event_location") {
              autofillData[fieldName] = { type: "text", text: ticket.event?.location || "TBA" };
            } else if (mapping === "ticket_type") {
              autofillData[fieldName] = { type: "text", text: ticket.ticketType || "General Admission" };
            } else if (mapping === "qr_code") {
              const verifyUrl = `${baseUrl}/verify/${ticket.ticketCode}`;
              autofillData[fieldName] = {
                type: "image",
                asset_id: undefined,
                url: `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(verifyUrl)}`,
              };
            } else if (mapping === "barcode") {
              autofillData[fieldName] = {
                type: "image",
                url: `https://barcodeapi.org/api/128/${ticket.ticketCode}`,
              };
            } else if (mapping === "code_auto") {
              // Auto-select based on codeType preference
              if (codeType === "barcode") {
                autofillData[fieldName] = {
                  type: "image",
                  url: `https://barcodeapi.org/api/128/${ticket.ticketCode}`,
                };
              } else {
                const verifyUrl = `${baseUrl}/verify/${ticket.ticketCode}`;
                autofillData[fieldName] = {
                  type: "image",
                  url: `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(verifyUrl)}`,
                };
              }
            }
          }

          const job = await CanvaService.createAutofillJob(accessToken, {
            templateId,
            title: `Ticket #${idx + 1} - ${ticket.recipientName || "Guest"} - ${ticket.ticketCode}`,
            data: autofillData,
          });

          results.push({
            ticketCode: ticket.ticketCode,
            recipientName: ticket.recipientName,
            jobId: job.job?.id,
            status: job.job?.status,
            designId: job.job?.result?.design?.id,
            editUrl: job.job?.result?.design?.urls?.edit_url,
          });
        } catch (err) {
          errors.push({
            ticketCode: ticket.ticketCode,
            error: err.message,
          });
        }
      });

      await Promise.all(batchPromises);

      // Brief pause between batches to respect rate limits
      if (i + BATCH_SIZE < tickets.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return { results, errors, total: tickets.length };
  },
};

export default CanvaService;
