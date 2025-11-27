import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import taskRoutes from "./routes/task.route.js"; // Ensure task routes are imported
import { app, server } from "./lib/socket.js";

import { schedulePendingMessages } from "./controllers/message.controller.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// --- Middleware Configuration ---
app.use(express.json({ limit: '50mb' })); // Increased limit for images
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Required for form data
app.use(cookieParser()); // Must be before routes

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", process.env.CLIENT_URL],
    credentials: true, // Essential for cookies to work
  })
);

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/tasks", taskRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, "0.0.0.0", async () => {
  console.log("Server is running on PORT:" + PORT);
  await connectDB();
  await schedulePendingMessages();
});