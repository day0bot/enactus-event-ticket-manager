import express from "express";
const router = express.Router();
import authenticationMiddleware from "../middleware/authenticationMiddleware.js";
import EventController from "../controllers/EventController.js";

// Public routes
router.get("/approved", EventController.GetAllApprovedEvents);
router.get("/", EventController.GetAllApprovedEvents);
router.get("/:id", EventController.GetEventById);

// Protected routes (Admin, Organizer, Standard User)
router.post(
  "/",
  authenticationMiddleware,
  EventController.CreateEvent
);

router.get(
  "/organizer/all",
  authenticationMiddleware,
  EventController.GetAllEvents
);

router.put(
  "/:id",
  authenticationMiddleware,
  EventController.UpdateEvent
);

router.delete(
  "/:id",
  authenticationMiddleware,
  EventController.DeleteEvent
);

export default router;