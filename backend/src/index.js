import express from 'express';

console.log("--- !!! BACKEND SERVERLESS FUNCTION STARTED !!! ---"); // Very first log

const app = express();
const PORT = process.env.PORT || 5001; // Vercel provides PORT

console.log(`--- Express app created. Attempting to listen on PORT ${PORT} ---`);

app.get('/api/test', (req, res) => {
  console.log("--- /api/test endpoint hit ---");
  res.status(200).json({ message: 'Backend is alive!' });
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error("--- UNHANDLED ERROR ---", err.stack);
  res.status(500).send('Something broke!');
});

// Vercel's node helper usually handles the listening, but we can try explicitly
// It might conflict, but worth trying if nothing else logs.
// If deployment fails with this, remove the server.listen block.
try {
    const server = app.listen(PORT, () => {
      console.log(`--- Server explicitly listening on ${PORT} ---`);
    });
    server.on('error', (err) => {
        console.error('--- Explicit listen error:', err, '---');
    });
} catch (listenError) {
    console.error('--- Error calling app.listen:', listenError, '---');
}


// IMPORTANT: For Vercel Serverless Functions, you often need to export the app
export default app; // Make sure this line is present if not using server.listen

console.log("--- Backend index.js execution finished? (May not show if async ops pending) ---");

/*
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

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, async () => { // Make listener async
  console.log("Server is running on PORT:" + PORT);
  await connectDB(); // Wait for DB connection */
  // +++ Schedule pending messages after DB connection +++
  await schedulePendingMessages();
  // ++++++++++++++++++++++++++++++++++++++++++++++++++++
});
