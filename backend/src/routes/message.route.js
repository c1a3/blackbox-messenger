import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
// Added deleteMessage import
import { getMessages, getUsersForSidebar, sendMessage, deleteMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, sendMessage);

// Added this route
router.post("/delete/:messageId", protectRoute, deleteMessage); // Using POST to easily send deleteType in body

export default router;