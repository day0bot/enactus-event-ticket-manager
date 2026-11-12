import "../polyfill.js";
import Booking from "../models/BookingModel.js";
import Event from "../models/EventModel.js";
import userModel from "../models/UserModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import Session from "../models/sessionModel.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
dotenv.config();

const secretKey = process.env.SECRET_KEY || "f7bdd79d79d44d3d599633a921f323a993b2bebc94bcf35f90790ff451bcb42c64a337eae1645b83ef35a412e28062b02f5678f9683d29682b13e6c7b8803c49";

const userController = {
  register: async (req, res) => {
    try {
      let { name, email, password, role } = req.body;

      // Validate input
      if (!name || !email || !password) {
        return res.status(400).json({
          message: "Please provide name, email, and password",
        });
      }

      // Trim input
      name = name.trim();
      email = email.trim();
      password = password.trim();

      // Validate role (optional)
      const validRoles = ["Standard User", "Organizer", "System Admin"];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role specified" });
      }

      // Check if user already exists
      const existingUser = await userModel.findOne({ email }); // Use userModel here
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user
      const newUser = new userModel({
        // Use userModel here
        name,
        email,
        password: hashedPassword,
        role: role || "Standard User", // Default to "Standard User" if no role is provided
      });

      await newUser.save();
      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  //login
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // Find the user by email
      const user = await userModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "Email not found" });
      }

      // Check if the password is correct
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Incorrect password" });
      }

      // Generate a JWT token
      const token = jwt.sign(
        { user: { userId: user._id, role: user.role } },
        secretKey,
        { expiresIn: "3h" }
      );

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 30 minutes
      const newSession = new Session({
        userId: user._id,
        token,
        expiresAt,
      });

      await newSession.save();

      return res
        .cookie("token", token, {
          expires: expiresAt,
          httpOnly: true,
          sameSite: "none",
          secure: true, // Use secure cookies in production
        })
        .status(200)
        .json({ message: "Login successfully", user, token });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  logout: async (req, res) => {
    try {
      const token = req.cookies.token; // Retrieve the token from cookies

      if (!token) {
        return res.status(400).json({ message: "No token provided" });
      }

      // Find and delete the session associated with the token
      await Session.findOneAndDelete({ token });

      // Clear the cookie
      res.clearCookie("token", {
        httpOnly: true,
        sameSite: "none",
        secure: true, // Use secure cookies in production
      });

      return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error("Error during logout:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  //forget password
  forgetPassword: async (req, res) => {
    try {
      const { email } = req.body;

      // Check if user exists
      const user = await userModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex"); // <-- fixed here

      user.resetPassToken = hashedOtp;
      user.resetPassExpires = Date.now() + 15 * 60 * 1000; // 15 mins

      await user.save();

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "TicketMan - Password Reset OTP",
        text: `Your OTP is: ${otp}\n\nThis OTP is valid for 15 minutes only!`,
        html: `
        <h1>Password Reset</h1>
        <p>Your one-time password for password reset is:</p>
        <h2 style="background-color: #f2f2f2; padding: 10px; text-align: center; font-size: 24px;">${otp}</h2>
        <p>This OTP will expire in 15 minutes.</p>
      `,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({ message: "Password reset OTP sent to your email" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  //get all users
  getAllUsers: async (req, res) => {
    try {
      const users = await userModel.find({});
      return res.status(200).json(users);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  },
  //get current user's profile
  getCurrentUser: async (req, res) => {
    try {
      const user = await userModel.findById(req.user.userId).select("-password"); // Exclude the password
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  //get a certain user's details (using ID)
  getUser: async (req, res) => {
    try {
      const user = await userModel.findById(req.params.id);
      return res.status(200).json(user);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  },
  //update current user's profile
  updateCurrentUser: async (req, res) => {
    try {
      // Ensure the user is authenticated
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: "Unauthorized access" });
      }

      const userId = req.user.userId;
      const { name, email, password, profilePicture } = req.body;

      // Validate input
      if (!name && !email && !password && !profilePicture) {
        return res.status(400).json({ message: "No fields to update provided" });
      }

      const updateData = {};
      if (name) updateData.name = name.trim();
      if (email) updateData.email = email.trim();
      if (profilePicture) updateData.profilePicture = profilePicture;

      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }
        updateData.password = await bcrypt.hash(password, 10);
      }

      // Update the user
      const updatedUser = await userModel
          .findByIdAndUpdate(userId, updateData, { new: true })
          .select("-password");

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json({
        user: updatedUser,
        message: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  //update a user's role
  updateUserRole: async (req, res) => {
    try {
      const { id } = req.params; // Get user ID from the request parameters
      const { role } = req.body; // Get the new role from the request body

      // Check if the requester is an admin
      if (req.user.role !== "System Admin") {
        return res.status(403).json({ message: "Access denied. Admins only." });
      }

      // Validate the ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Validate the role
      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }

      const validRoles = ["Standard User", "Organizer", "System Admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role specified" });
      }

      // Find the user by ID
      const user = await userModel.findById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if the role is already assigned
      if (user.role === role) {
        return res.status(400).json({ message: "User already has this role" });
      }

      // Update the user's role
      user.role = role;
      await user.save();

      res.status(200).json({ message: "User role updated successfully", user });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Internal server error", error });
    }
  },
  //delete a certain user (using ID)
  deleteUser: async (req, res) => {
    try {
      const user = await userModel.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await Booking.deleteMany({ user: user._id });
      if (user.role === "Organizer") {
        await Event.deleteMany({ organizer: user._id });
      }
      return res.status(200).json({ user, msg: "User deleted successfully" });
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  },
  getCurrentUserBookings: async (req, res) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: "Unauthorized access" });
      }
      const userId = req.user.userId;
      const bookings = await Booking.find({ user: userId }).populate("event");
      // Always return 200 with an array (even if empty)
      return res.status(200).json(bookings);
    } catch (error) {
      console.error("Error fetching user bookings:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  getCurrentUserEvents: async (req, res) => {
    try {
      console.log("Authenticated User:", req.user); // Log the user object
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: "Unauthorized access" });
      }

      const userId = req.user.userId;
      const events = await Event.find({ organizer: userId });

      if (!events || events.length === 0) {
        return res
          .status(404)
          .json({ message: "No events found for this user" });
      }

      return res.status(200).json(events);
    } catch (error) {
      console.error("Error fetching user events:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  },
  // Get analytics for current user's events (for Event Organizer)
  getCurrentUserEventAnalytics: async (req, res) => {
    try {
      const userId = req.user.userId;

      // Fetch all events organized by the current user
      const events = await Event.find({ organizer: userId });

      // Generate analytics for each event
      const analytics = await Promise.all(
        events.map(async (event) => {
          // Count total bookings
          const bookingsCount = await Booking.countDocuments({
            event: event._id,
          });

          // Calculate revenue based on ticket price and tickets sold
          const soldTickets = event.totalTickets - event.remainingTickets;
          const totalRevenue = soldTickets * event.ticketPricing;

          return {
            eventId: event._id,
            eventName: event.title,
            description: event.description,
            date: event.date,
            location: event.location,
            category: event.category,
            ticketPricing: event.ticketPricing,
            totalTickets: event.totalTickets,
            remainingTickets: event.remainingTickets,
            bookingsCount,
            totalRevenue,
          };
        })
      );

      return res.status(200).json(analytics);
    } catch (error) {
      console.error("Error fetching event analytics:", error);
      return res.status(500).json({ message: error.message });
    }
  },

 // upload profile picture
  uploadProfilePicture : async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_pictures",
      });

      const userId = req.user.userId;
      const updatedUser = await userModel.findByIdAndUpdate(
          userId,
          { profilePicture: result.secure_url },
          { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({
        message: "Profile picture uploaded successfully",
        profilePicture: result.secure_url,
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Change password with OTP
  changePasswordWithOtp: async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Password restriction (same as register)
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const user = await userModel.findOne({ email });
      if (!user || !user.resetPassToken || !user.resetPassExpires) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      if (user.resetPassExpires < Date.now()) {
        return res.status(400).json({ message: "OTP has expired" });
      }

      const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");
      if (hashedOtp !== user.resetPassToken) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Check if new password is the same as the old one
      const isSame = await bcrypt.compare(newPassword, user.password);
      if (isSame) {
        return res.status(400).json({ message: "New password cannot be the same as the old password" });
      }

      user.password = await bcrypt.hash(newPassword, 10);
      user.resetPassToken = undefined;
      user.resetPassExpires = undefined;
      await user.save();

      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

};
export default userController;
