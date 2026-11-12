import express from "express";
const router = express.Router();
import authorizationMiddleware from "../middleware/authorizationMiddleware.js";
import EventController from "../controllers/EventController.js";

// Public routes
router.get("/approved", EventController.GetAllApprovedEvents);
router.get("/", EventController.GetAllApprovedEvents);
router.get("/:id", EventController.GetEventById);

// Organizer routes (protected)
router.post(
  "/",
  authorizationMiddleware(["Organizer"]),
  EventController.CreateEvent
);

router.get(
  "/organizer/all",
  authorizationMiddleware(["Organizer"]),
  EventController.GetAllEvents
);

router.put(
  "/:id",
  authorizationMiddleware(["Organizer"]),
  EventController.UpdateEvent
);

router.delete(
  "/:id",
  authorizationMiddleware(["Organizer"]),
  EventController.DeleteEvent
);

export default router;