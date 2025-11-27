import SharedTask from "../models/sharedTask.model.js";
import Group from "../models/group.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getSharedTasks = async (req, res) => {
    try {
        const { id: chatTargetId } = req.params; // groupId or otherUserId
        const myId = req.user._id;
        const { isGroup } = req.query;

        let query = {};

        if (isGroup === 'true') {
            query = { isGroup: true, groupId: chatTargetId };
        } else {
            query = { 
                isGroup: false, 
                participants: { $all: [myId, chatTargetId] } 
            };
        }

        const tasks = await SharedTask.find(query)
            .populate("completedBy", "fullName profilePic")
            .populate("createdBy", "fullName")
            .sort({ createdAt: 1 });

        res.status(200).json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const createSharedTask = async (req, res) => {
    try {
        const { text, isGroup, targetId } = req.body;
        const senderId = req.user._id;

        const newTaskData = {
            text,
            isGroup,
            createdBy: senderId,
        };

        if (isGroup) {
            newTaskData.groupId = targetId;
        } else {
            newTaskData.participants = [senderId, targetId];
        }

        const newTask = new SharedTask(newTaskData);
        await newTask.save();
        
        // Populate for immediate UI update
        await newTask.populate("createdBy", "fullName");

        // Real-time Socket Emit
        emitTaskUpdate(newTask, "newTaskAdded");

        res.status(201).json(newTask);
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const toggleTaskCompletion = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user._id;

        const task = await SharedTask.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });

        // Toggle Logic
        if (task.isCompleted) {
            task.isCompleted = false;
            task.completedBy = null;
        } else {
            task.isCompleted = true;
            task.completedBy = userId;
        }

        await task.save();
        await task.populate("completedBy", "fullName profilePic");
        await task.populate("createdBy", "fullName");

        // Real-time Socket Emit
        emitTaskUpdate(task, "taskUpdated");

        res.status(200).json(task);
    } catch (error) {
        console.error("Error toggling task:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// --- Helper to Broadcast Events ---
const emitTaskUpdate = async (task, eventName) => {
    if (task.isGroup) {
        const group = await Group.findById(task.groupId);
        if(group) {
            group.members.forEach(memberId => {
                const sId = getReceiverSocketId(memberId.toString());
                if(sId) io.to(sId).emit(eventName, task);
            });
        }
    } else {
        task.participants.forEach(userId => {
            const sId = getReceiverSocketId(userId.toString());
            if(sId) io.to(sId).emit(eventName, task);
        });
    }
};