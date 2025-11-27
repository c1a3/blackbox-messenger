import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createSharedTask, getSharedTasks, toggleTaskCompletion } from "../controllers/task.controller.js";

const router = express.Router();

router.get("/:id", protectRoute, getSharedTasks);
router.post("/", protectRoute, createSharedTask);
router.put("/:taskId/toggle", protectRoute, toggleTaskCompletion);

export default router;