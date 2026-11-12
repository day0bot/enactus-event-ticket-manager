import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import EventRouter from "./routes/Event.js";
import AdminEventRouter from "./routes/AdminEvent.js";
import bookingRoutes from "./routes/Bookings.js";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/users.js";
import authRouter from "./routes/auth.js";
import cors from "cors";
import authenticationMiddleware from "./middleware/authenticationMiddleware.js";
import { v2 as cloudinary } from "cloudinary";
import EventController from "./controllers/EventController.js";


const app = express();
dotenv.config();


// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(
    cors({
      origin: "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    })
);

// Public routes
app.use("/api/v1/auth", authRouter);

// Public event endpoints
app.get("/api/v1/events", EventController.GetAllApprovedEvents);
app.get("/api/v1/events/approved", EventController.GetAllApprovedEvents);
app.get("/api/v1/events/:id", EventController.GetEventById);

// Protected routes
app.use(authenticationMiddleware);
app.use("/api/v1/events", EventRouter);
app.use("/api/v1/admin/events", AdminEventRouter);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/users", userRoutes);

// Basic route
app.get("/", (req, res) => {
  res.send("Hello from the server!");
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const startServer = async (port) => {
  try {
    // Connect to database first
    await connectDB();
    
    const server = app.listen(port, () => {
      console.log(`Server started at http://localhost:${port}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} is in use. Trying another port...`);
        startServer(port + 1); // Retry with the next port
      } else {
        console.error("Server error:", err);
        process.exit(1);
      }
    });

    process.on("SIGINT", () => {
      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  }
};

const PORT = parseInt(process.env.PORT, 10) || 8000;
startServer(PORT);