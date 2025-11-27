import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import { app, server } from "./lib/socket.js";
import { schedulePendingMessages } from "./controllers/message.controller.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// --- MIDDLEWARE ORDER IS CRITICAL HERE ---

// 1. Increase limits immediately (handles large base64 images)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. Cookie Parser
app.use(cookieParser());

// 3. CORS
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", process.env.CLIENT_URL],
    credentials: true,
  })
);

// 4. Debug Middleware (Logs every request size)
app.use((req, res, next) => {
  // Only log POST requests to /messages/send
  if (req.method === 'POST' && req.path.includes('/messages/send')) {
    const size = JSON.stringify(req.body).length;
    console.log(`[DEBUG] Incoming Message Request: ${size} bytes`);
    if (req.body.image) console.log(`[DEBUG] Image data present (starts with): ${req.body.image.substring(0, 30)}...`);
    else console.log(`[DEBUG] No image data in body.`);
  }
  next();
});

// 5. Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);

// 6. Static Files (Production)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// 7. Global Error Handler (Catches "Payload Too Large" errors)
app.use((err, req, res, next) => {
  console.error("[SERVER ERROR]:", err.message);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: "Image is too large for the server configuration." });
  }
  res.status(500).json({ message: "Internal Server Error", error: err.message });
});

server.listen(PORT, "0.0.0.0", async () => {
  console.log("Server is running on PORT:" + PORT);
  await connectDB();
  await schedulePendingMessages();
});