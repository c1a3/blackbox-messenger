import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js"; 
import Group from "../models/group.model.js";     

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", process.env.CLIENT_URL], 
    methods: ["GET", "POST"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId]?.socketId;
}

// { userId: { socketId: "...", instanceId: "..." } }
const userSocketMap = {}; 

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  const instanceId = socket.handshake.query.instanceId || "blackbox.main.org"; 

  if (userId) {
      userSocketMap[userId] = { socketId: socket.id, instanceId };
  }

  // --- Helper: Broadcast Only to Same Instance ---
  const broadcastOnlineUsers = () => {
      const usersByInstance = {};
      
      Object.keys(userSocketMap).forEach(uId => {
          const uInstance = userSocketMap[uId].instanceId;
          if (!usersByInstance[uInstance]) usersByInstance[uInstance] = [];
          usersByInstance[uInstance].push(uId);
      });

      Object.keys(userSocketMap).forEach(uId => {
          const targetSocketId = userSocketMap[uId].socketId;
          const targetInstance = userSocketMap[uId].instanceId;
          io.to(targetSocketId).emit("getOnlineUsers", usersByInstance[targetInstance] || []);
      });
  };

  // Broadcast immediately on connection
  broadcastOnlineUsers();

  socket.on("disconnect", () => {
    // FIX: Only delete if the disconnecting socket is the *current* one for this user
    // (Prevents race condition on quick page reload)
    if (userSocketMap[userId]?.socketId === socket.id) {
        delete userSocketMap[userId];
        broadcastOnlineUsers();
    }
  });

  // ... [Keep callUser, answerCall, endCall, messagesViewed logic exactly as is] ...
  socket.on("callUser", (data) => {
    const receiverSocketId = getReceiverSocketId(data.userToCall);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", { 
        signal: data.signalData, 
        from: data.from, 
        name: data.name,
        profilePic: data.profilePic 
      });
    }
  });

  socket.on("answerCall", (data) => {
    const callerSocketId = getReceiverSocketId(data.to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callAccepted", data.signal);
    }
  });

  socket.on("endCall", (data) => {
    const socketId = getReceiverSocketId(data.to);
    if (socketId) {
      io.to(socketId).emit("callEnded");
    }
  });

  socket.on("messagesViewed", async ({ peerId, isGroup }) => {
    try {
        const viewerId = socket.handshake.query.userId;
        const query = { 
            isEphemeral: true, 
            isSent: true,
        };

        if (isGroup) {
            query.groupId = peerId;
            query.senderId = { $ne: viewerId }; 
        } else {
            query.senderId = peerId;
            query.receiverId = viewerId;
        }

        const messagesToBurn = await Message.find(query);

        if (messagesToBurn.length > 0) {
            messagesToBurn.forEach(msg => {
                const burnTime = (msg.ephemeralDuration || 5) * 1000;

                setTimeout(async () => {
                    const exists = await Message.findById(msg._id);
                    if (!exists) return;

                    await Message.findByIdAndDelete(msg._id);

                    const evt = "messageBurned";
                    const payload = { messageId: msg._id, groupId: msg.groupId };
                    
                    if (msg.groupId) {
                        const group = await Group.findById(msg.groupId);
                        group?.members.forEach(memberId => {
                            const sId = getReceiverSocketId(memberId.toString());
                            if (sId) io.to(sId).emit(evt, payload);
                        });
                    } else {
                        const rSocket = getReceiverSocketId(msg.receiverId.toString());
                        const sSocket = getReceiverSocketId(msg.senderId.toString());
                        if (rSocket) io.to(rSocket).emit(evt, payload);
                        if (sSocket) io.to(sSocket).emit(evt, payload);
                    }
                }, burnTime);
            });
        }
    } catch (e) {
        console.error("Error in messagesViewed:", e);
    }
  });
});

export { io, app, server };