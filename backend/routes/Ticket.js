import express from "express";
import TicketController from "../controllers/TicketController.js";
import authenticationMiddleware from "../middleware/authenticationMiddleware.js";

const router = express.Router();

// Allow authenticated users (Admin, Organizer, Standard User) to generate and view tickets
router.post("/generate", authenticationMiddleware, TicketController.generateTickets);
router.post("/verify", authenticationMiddleware, TicketController.verifyTicket);
router.get("/", authenticationMiddleware, TicketController.getTickets);
router.delete("/:id", authenticationMiddleware, TicketController.deleteTicket);

export default router;
