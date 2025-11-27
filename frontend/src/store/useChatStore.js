import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  selectedGroup: null, 
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
       console.error("Error getting users:", error);
       toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    if (!userId) return;
    set({ isMessagesLoading: true, messages: [] });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      console.error("Error getting messages:", error);
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, selectedGroup } = get();
    
    if (!selectedUser && !selectedGroup) return toast.error("No chat selected");

    const targetId = selectedGroup ? selectedGroup._id : selectedUser._id;
    const payload = { ...messageData, isGroup: !!selectedGroup };

    try {
      const res = await axiosInstance.post(`/messages/send/${targetId}`, payload);

        if (res.status === 201) {
             console.log("Message sent immediately");
        } else if (res.status === 202) {
             console.log("Message scheduled");
        }
    } catch (error) {
       console.error("Error sending/scheduling message:", error);
       const errorMessage = error.response?.data?.message || "Failed to send/schedule message";
       toast.error(errorMessage);
       throw new Error(errorMessage);
    }
  },

  deleteMessage: async (messageId, deleteType) => {
     const currentAuthUserId = useAuthStore.getState().authUser._id;
     set((state) => ({
        messages: state.messages.map(msg => {
            if (msg._id === messageId) {
                if (deleteType === 'everyone') {
                    return { ...msg, text: "🚫 This message was deleted", image: null, deletedFor: [] };
                } else if (deleteType === 'me') {
                    const deletedForArray = msg.deletedFor ? [...msg.deletedFor] : [];
                    if (!deletedForArray.includes(currentAuthUserId)) {
                         deletedForArray.push(currentAuthUserId);
                    }
                    return { ...msg, deletedFor: deletedForArray };
                }
            }
            return msg;
        })
     }));

    try {
      await axiosInstance.post(`/messages/delete/${messageId}`, { deleteType });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(error.response?.data?.message || "Failed to delete message");
       const { selectedUser, selectedGroup } = get();
       const targetId = selectedGroup ? selectedGroup._id : (selectedUser ? selectedUser._id : null);
       if(targetId) get().getMessages(targetId);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messageBurned");

    socket.on("newMessage", (newMessage) => {
       const { selectedUser, selectedGroup, messages } = get();
       const currentAuthUserId = useAuthStore.getState().authUser._id;
       const messageExists = messages.some(msg => msg._id === newMessage._id);

       if (!messageExists) {
            let isRelevantToSelectedChat = false;

            if (selectedGroup) {
                if (newMessage.groupId === selectedGroup._id) {
                    isRelevantToSelectedChat = true;
                }
            } else if (selectedUser) {
                if (!newMessage.groupId && 
                   ((newMessage.senderId === currentAuthUserId && newMessage.receiverId === selectedUser._id) ||
                    (newMessage.receiverId === currentAuthUserId && newMessage.senderId === selectedUser._id))) {
                    isRelevantToSelectedChat = true;
                }
            }

            if (isRelevantToSelectedChat) {
                set((state) => ({
                    messages: state.messages.some(msg => msg._id === newMessage._id)
                                ? state.messages
                                : [...state.messages, newMessage],
                }));
            }
       }
    });

    socket.on("messageDeleted", (deletionInfo) => {
      const { messageId, deleteType, updatedText, senderId, receiverId, groupId } = deletionInfo;
      const currentAuthUserId = useAuthStore.getState().authUser._id;
      const { selectedUser, selectedGroup } = get();

      let isRelevant = false;
      if (selectedGroup && groupId === selectedGroup._id) {
          isRelevant = true;
      } else if (selectedUser && !groupId && (senderId === currentAuthUserId || receiverId === currentAuthUserId)) {
          isRelevant = true;
      }

      if (isRelevant) {
        set((state) => ({
            messages: state.messages.map((msg) => {
            if (msg._id === messageId) {
                if (deleteType === "everyone") {
                    return { ...msg, text: updatedText, image: null, deletedFor: [] };
                } else if (deleteType === "me") {
                    const userToDeleteFor = currentAuthUserId; 
                    const deletedForArray = msg.deletedFor ? [...msg.deletedFor] : [];
                    if (!deletedForArray.includes(userToDeleteFor)) {
                        deletedForArray.push(userToDeleteFor);
                    }
                    return { ...msg, deletedFor: deletedForArray };
                }
            }
            return msg;
            }),
        }));
      }
    });

    // NEW: Handle Hard Delete (Burn)
    socket.on("messageBurned", ({ messageId }) => {
        set((state) => ({
            messages: state.messages.filter((msg) => msg._id !== messageId)
        }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
        socket.off("newMessage");
        socket.off("messageDeleted");
        socket.off("messageBurned");
    }
  },

  setSelectedUser: (selectedUser) => {
      set({ selectedUser, selectedGroup: null }); 
      if (selectedUser) {
          get().getMessages(selectedUser._id);
          get().subscribeToMessages();
      } else {
         set({ messages: [] });
         get().unsubscribeFromMessages();
      }
  },

  setSelectedGroup: (selectedGroup) => {
      set({ selectedGroup, selectedUser: null });
      if (selectedGroup) {
          get().getMessages(selectedGroup._id);
          get().subscribeToMessages();
      } else {
         set({ messages: [] });
         get().unsubscribeFromMessages();
      }
  },
}));