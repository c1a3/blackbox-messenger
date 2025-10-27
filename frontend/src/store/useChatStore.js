import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
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
      // Fetch only messages that ARE sent (isSent: true is the default filter on backend now)
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      console.error("Error getting messages:", error);
      toast.error(error.response?.data?.message || "Failed to fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Modified sendMessage action
  sendMessage: async (messageData) => {
    const { selectedUser } = get(); // No need for 'messages' here
    if (!selectedUser) return toast.error("No user selected");
    try {
        // Response will either be the sent message (201) or a scheduled confirmation (202)
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);

        // If it was scheduled, the backend sends a 202 status and a confirmation.
        // The actual message will arrive via socket later.
        // If it was sent immediately (201), the message data is in res.data.
        // We rely on the socket 'newMessage' event to add the message to the state for consistency
        // (handling both sender and receiver updates the same way).
        if (res.status === 201) {
            // Optional: Can still add optimistically here if needed, but socket handles it
            // set({ messages: [...get().messages, res.data] });
             console.log("Message sent immediately, waiting for socket confirmation.");
        } else if (res.status === 202) {
            // Message scheduled confirmation already shown via toast in MessageInput
             console.log("Message scheduled confirmation received.");
            // Optionally, you could add a temporary placeholder message here
        }

    } catch (error) {
       console.error("Error sending/scheduling message:", error);
       toast.error(error.response?.data?.message || "Failed to send/schedule message");
    }
  },


  deleteMessage: async (messageId, deleteType) => {
     const currentAuthUserId = useAuthStore.getState().authUser._id;
     // Optimistic update
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
       const { selectedUser } = get();
       if (selectedUser) get().getMessages(selectedUser._id);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messageDeleted");

    socket.on("newMessage", (newMessage) => {
       const { selectedUser: currentUser, messages } = get();
       const currentAuthUserId = useAuthStore.getState().authUser._id;
       const messageExists = messages.some(msg => msg._id === newMessage._id);

        // Ensure message hasn't been processed already AND belongs to the current user/chat
       if (!messageExists) {
            const isRelevantToSelectedChat = currentUser &&
                    ((newMessage.senderId === currentAuthUserId && newMessage.receiverId === currentUser._id) ||
                    (newMessage.receiverId === currentAuthUserId && newMessage.senderId === currentUser._id));

            if (isRelevantToSelectedChat) {
                set((state) => ({
                    // Check again inside set to prevent race conditions
                    messages: state.messages.some(msg => msg._id === newMessage._id)
                                ? state.messages
                                : [...state.messages, newMessage],
                }));
            }
       }
    });

    socket.on("messageDeleted", (deletionInfo) => {
      const { messageId, deleteType, updatedText, senderId, receiverId } = deletionInfo;
      const currentAuthUserId = useAuthStore.getState().authUser._id;
       if (senderId === currentAuthUserId || receiverId === currentAuthUserId) {
            set((state) => ({
                messages: state.messages.map((msg) => {
                if (msg._id === messageId) {
                    if (deleteType === "everyone") {
                      return { ...msg, text: updatedText, image: null, deletedFor: [] };
                    } else if (deleteType === "me") {
                       const userToDeleteFor = senderId === currentAuthUserId ? senderId : receiverId;
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
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
        socket.off("newMessage");
        socket.off("messageDeleted");
    }
  },

  setSelectedUser: (selectedUser) => {
      set({ selectedUser });
      if (selectedUser) {
          get().getMessages(selectedUser._id);
          get().subscribeToMessages();
      } else {
         set({ messages: [] });
         get().unsubscribeFromMessages(); // Unsubscribe if no user is selected
      }
  },
}));