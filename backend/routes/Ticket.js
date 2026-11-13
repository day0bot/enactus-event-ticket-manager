import express from "express";
import TicketController from "../controllers/TicketController.js";
import authenticationMiddleware from "../middleware/authenticationMiddleware.js";

const router = express.Router();

// Public endpoints for mobile phone QR scanners & gate verification (ZERO login required)
router.get("/public-scan/:code", TicketController.publicScanTicket);
router.post("/public-scan/:code", TicketController.publicScanTicket);
router.get("/verify/:code", TicketController.publicScanTicket);
router.post("/verify", TicketController.verifyTicket);

// Allow authenticated users (Admin, Organizer, Standard User) to generate and view tickets
router.post("/generate", authenticationMiddleware, TicketController.generateTickets);
router.get("/", authenticationMiddleware, TicketController.getTickets);
router.delete("/:id", authenticationMiddleware, TicketController.deleteTicket);

export default router;
