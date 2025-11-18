import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
// Import useChatStore to update the selected group reference
import { useChatStore } from "./useChatStore"; 

export const useGroupStore = create((set, get) => ({
  groups: [],
  isCreatingGroup: false,
  isFetchingGroups: false,
  isUpdatingGroup: false,

  fetchGroups: async () => {
    set({ isFetchingGroups: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      set({ isFetchingGroups: false });
    }
  },

  createGroup: async (groupData) => {
    set({ isCreatingGroup: true });
    try {
      const res = await axiosInstance.post("/groups", groupData);
      set((state) => ({ groups: [...state.groups, res.data] }));
      toast.success("Group created successfully");
      return true;
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(error.response?.data?.message || "Failed to create group");
      return false;
    } finally {
      set({ isCreatingGroup: false });
    }
  },

  updateGroupProfile: async (groupId, data) => {
      set({ isUpdatingGroup: true });
      try {
          const res = await axiosInstance.put(`/groups/${groupId}`, data);
          const updatedGroup = res.data;

          // Update groups list
          set((state) => ({
              groups: state.groups.map((g) => g._id === groupId ? updatedGroup : g)
          }));

          // If this is the currently selected group, update it in ChatStore too
          const { selectedGroup, setSelectedGroup } = useChatStore.getState();
          if (selectedGroup && selectedGroup._id === groupId) {
              setSelectedGroup(updatedGroup);
          }

          toast.success("Group profile updated");
      } catch (error) {
          console.error("Error updating group:", error);
          toast.error(error.response?.data?.message || "Failed to update group");
      } finally {
          set({ isUpdatingGroup: false });
      }
  }
}));