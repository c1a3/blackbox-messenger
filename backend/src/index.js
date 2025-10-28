import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

// +++ Import the scheduler function +++
import { schedulePendingMessages } from "./controllers/message.controller.js";
// +++++++++++++++++++++++++++++++++++++

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json({ limit: '5mb' })); // Increase payload limit for potential base64 images
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"], // Allow both localhost and 127.0.0.1
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

/*
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}
*/

server.listen(PORT, async () => { // Make listener async
  console.log("Server is running on PORT:" + PORT);
  await connectDB(); // Wait for DB connection
  // +++ Schedule pending messages after DB connection +++
  await schedulePendingMessages();
  // ++++++++++++++++++++++++++++++++++++++++++++++++++++
});
