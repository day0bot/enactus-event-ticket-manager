import express from "express";
import userController from "../controllers/UserController.js";
import authenticationMiddleware from "../middleware/authenticationMiddleware.js";

const router = express.Router();

// Register a user
router.post("/register", userController.register);

// User login
router.post("/login", userController.login);

// User logout
router.post("/logout", userController.logout);

// Forget password
router.put("/forgetPassword", userController.forgetPassword);

// Change password with OTP
router.post("/changePasswordWithOtp", userController.changePasswordWithOtp);

export default router;