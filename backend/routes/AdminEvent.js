import express from "express";
const router = express.Router();
import authorizationMiddleware from "../middleware/authorizationMiddleware.js";
import EventController from "../controllers/EventController.js";

// Get list of all events (Admin only)
router.get(
  "/",
  authorizationMiddleware(["System Admin"]),
  EventController.GetAllEvents
);

// Update event status (Admin only)
router.put(
  "/:id/status",
  authorizationMiddleware(["System Admin"]),
  EventController.UpdateEvent
);

export default router; 