import express from "express";
import userController from "../controllers/UserController.js";
import authorizationMiddleware from "../middleware/authorizationMiddleware.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
const router = express.Router();

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "profile_pictures",
        allowed_formats: ["jpg", "png", "jpeg"],
    },
});

const upload = multer({ storage });

// Get current user's bookings (Standard User only)
router.get(
    "/bookings",
    authorizationMiddleware(["Standard User"]),
    userController.getCurrentUserBookings
);

// Get current user's events (Event Organizer only)
router.get(
    "/events",
    authorizationMiddleware(["Organizer"]),
    userController.getCurrentUserEvents
);

// Get analytics of the current user's events (Event Organizer only)
router.get(
    "/events/analytics",
    authorizationMiddleware(["Organizer"]),
    userController.getCurrentUserEventAnalytics
);

// Get a list of all users (Admin only)
router.get(
    "/",
    authorizationMiddleware(["System Admin"]),
    userController.getAllUsers
);

// Get current user's profile (Authenticated Users only)
router.get(
    "/profile",
    authorizationMiddleware(["Standard User", "Organizer", "System Admin"]),
    userController.getCurrentUser
);

// Update current user's profile (Authenticated Users only)
router.put(
    "/profile",
    authorizationMiddleware(["Standard User", "Organizer", "System Admin"]),
    userController.updateCurrentUser
);

// Upload profile picture (Authenticated Users only)
router.post(
    "/upload-profile-picture",
    authorizationMiddleware(["Standard User", "Organizer", "System Admin"]),
    upload.single("profilePicture"),
    userController.uploadProfilePicture
);

// Get details of a single user (Admin only)
router.get(
    "/:id",
    authorizationMiddleware(["System Admin"]),
    userController.getUser
);

// Update user’s role (Admin only)
router.put(
    "/:id",
    authorizationMiddleware(["System Admin"]),
    userController.updateUserRole
);

// Delete a user (Admin only)
router.delete(
    "/:id",
    authorizationMiddleware(["System Admin"]),
    userController.deleteUser
);

// Logout a user (Authenticated Users only)
router.post(
    "/logout",
    authorizationMiddleware(["Standard User", "Organizer", "System Admin"]),
    userController.logout
);


export default router;