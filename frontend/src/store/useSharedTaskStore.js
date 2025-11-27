import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useSharedTaskStore = create((set, get) => ({
  tasks: [],
  isTasksLoading: false,
  isPanelOpen: false, // Toggle for the UI panel

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  closePanel: () => set({ isPanelOpen: false }),

  getSharedTasks: async (targetId, isGroup) => {
    if (!targetId) return;
    set({ isTasksLoading: true });
    try {
      const res = await axiosInstance.get(`/tasks/${targetId}`, {
          params: { isGroup }
      });
      set({ tasks: res.data });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      set({ isTasksLoading: false });
    }
  },

  addTask: async (text, targetId, isGroup) => {
    try {
      await axiosInstance.post("/tasks", { text, targetId, isGroup });
      // No need to manually update state here if socket is working, 
      // but good for optimistic UI updates if needed.
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    }
  },

  toggleTask: async (taskId) => {
    try {
      await axiosInstance.put(`/tasks/${taskId}/toggle`);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  },

  // Socket Listeners
  subscribeToTaskUpdates: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newTaskAdded");
    socket.off("taskUpdated");

    socket.on("newTaskAdded", (newTask) => {
       set((state) => ({ tasks: [...state.tasks, newTask] }));
    });

    socket.on("taskUpdated", (updatedTask) => {
        set((state) => ({
            tasks: state.tasks.map((t) => t._id === updatedTask._id ? updatedTask : t)
        }));
    });
  },

  unsubscribeFromTaskUpdates: () => {
      const socket = useAuthStore.getState().socket;
      if (socket) {
          socket.off("newTaskAdded");
          socket.off("taskUpdated");
      }
  }
}));