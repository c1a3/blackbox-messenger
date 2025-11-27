import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js"; 
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import schedule from 'node-schedule';
import moment from 'moment-timezone';

// ... [Keep deliverMessage function as is] ...
const deliverMessage = async (message) => {
    try {
        if (message.groupId) {
            const group = await Group.findById(message.groupId);
            if (group) {
                group.members.forEach((memberId) => {
                    const socketId = getReceiverSocketId(memberId.toString());
                    if (socketId) {
                        io.to(socketId).emit("newMessage", message);
                    }
                });
            }
        } else {
            const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newMessage", message);
            }
            const senderSocketId = getReceiverSocketId(message.senderId.toString());
            if (senderSocketId) {
                io.to(senderSocketId).emit("newMessage", message);
            }
        }
        console.log(`Delivered message ${message._id} at ${new Date()}`);
    } catch (error) {
        console.error(`Error delivering message ${message._id}:`, error.message);
    }
};

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const currentInstanceId = req.user.instanceId; // Get user's server ID

        // FILTER: Only fetch users from the SAME instance
        const filteredUsers = await User.find({ 
            _id: { $ne: loggedInUserId },
            instanceId: currentInstanceId 
        }).select("-password");

        res.status(200).json(filteredUsers);
      } catch (error) {
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ error: "Internal server error" });
      }
};

// ... [Keep getMessages, sendMessage, deleteMessage, schedulePendingMessages exactly as they were] ...
// (I am omitting them to save space, but DO NOT DELETE THEM from your file)
export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        const isGroup = await Group.exists({ _id: userToChatId });

        let messages;
        if (isGroup) {
             messages = await Message.find({
                groupId: userToChatId,
                isSent: true
             });
        } else {
             messages = await Message.find({
                $or: [
                    { senderId: myId, receiverId: userToChatId },
                    { senderId: userToChatId, receiverId: myId },
                ],
                isSent: true
            });
        }

        res.status(200).json(messages);
      } catch (error) {
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
      }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, scheduledSendTime, isGroup, isEphemeral, ephemeralDuration } = req.body; 
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let scheduleDateUTC = null;
    const timeZone = 'Asia/Kolkata';

    if (scheduledSendTime) {
        try {
            const scheduledMoment = moment(scheduledSendTime); 
            if (!scheduledMoment.isValid()) {
                 return res.status(400).json({ error: "Invalid scheduled time format or value provided" });
            }
            if (scheduledMoment.isSameOrBefore(moment().subtract(2, 'seconds'))) {
                return res.status(400).json({ error: "Scheduled time must be in the future." });
            }
            scheduleDateUTC = scheduledMoment.toDate();
        } catch (parseError) {
             return res.status(500).json({ error: "Internal server error processing schedule time." });
        }
    }

    const messageData = {
        senderId,
        text,
        image: imageUrl,
        isScheduled: !!scheduleDateUTC,
        scheduledSendTime: scheduleDateUTC,
        isSent: !scheduleDateUTC,
        isEphemeral: !!isEphemeral, 
        ephemeralDuration: ephemeralDuration || 5, 
    };

    if (isGroup) {
        messageData.groupId = receiverId; 
    } else {
        messageData.receiverId = receiverId;
    }

    const newMessage = new Message(messageData);

    await newMessage.save();

    if (scheduleDateUTC) {
        const job = schedule.scheduleJob(newMessage._id.toString(), scheduleDateUTC, async () => {
            const msgToSend = await Message.findOne({ _id: newMessage._id, isScheduled: true, isSent: false });
            if (msgToSend) {
                msgToSend.isSent = true;
                msgToSend.isScheduled = false;
                await msgToSend.save();
                await deliverMessage(msgToSend);
            }
        });

        if (!job) {
             await Message.deleteOne({ _id: newMessage._id });
             return res.status(500).json({ error: "Failed to schedule message send time." });
        }
        const formattedTime = moment(scheduleDateUTC).tz(timeZone).format('YYYY-MM-DD h:mm A z');
        res.status(202).json({ message: `Message scheduled successfully for ${formattedTime}`, scheduledMessage: newMessage });

    } else {
        await deliverMessage(newMessage);
        res.status(201).json(newMessage);
    }

  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
     try {
        const { messageId } = req.params;
        const { deleteType } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);

        if (!message) {
          return res.status(404).json({ error: "Message not found" });
        }

        if (deleteType === "everyone" && message.isScheduled && !message.isSent) {
             const jobName = message._id.toString();
             const job = schedule.scheduledJobs[jobName];
             if (job) job.cancel();
        }

        if (message.senderId.toString() !== userId.toString()) {
          return res.status(403).json({ error: "Unauthorized to delete this message" });
        }

        let updatedMessage;

        if (deleteType === "everyone") {
          updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            {
              text: "🚫 This message was deleted",
              image: null,
              deletedFor: [],
              isScheduled: false,
            },
            { new: true }
          );
        } else if (deleteType === "me") {
          updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            { $addToSet: { deletedFor: userId } },
            { new: true }
          );
        } else {
          return res.status(400).json({ error: "Invalid delete type" });
        }

        const deletionInfo = {
           messageId: message._id,
           deleteType: deleteType,
           senderId: userId,
           updatedText: deleteType === "everyone" ? updatedMessage.text : null,
        };

        if (message.groupId) {
            deletionInfo.groupId = message.groupId;
            const group = await Group.findById(message.groupId);
            if(group) {
                 group.members.forEach(memberId => {
                     const sId = getReceiverSocketId(memberId.toString());
                     if(sId) io.to(sId).emit("messageDeleted", deletionInfo);
                 })
            }
        } else {
             deletionInfo.receiverId = message.receiverId;
             const receiverSocketId = getReceiverSocketId(message.receiverId);
             const senderSocketId = getReceiverSocketId(userId);
             if (receiverSocketId) io.to(receiverSocketId).emit("messageDeleted", deletionInfo);
             if (senderSocketId) io.to(senderSocketId).emit("messageDeleted", deletionInfo);
        }

        res.status(200).json({ message: "Message deleted successfully", updatedMessage });

      } catch (error) {
        console.log("Error in deleteMessage controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
      }
};

export const schedulePendingMessages = async () => {
    try {
        const now = new Date();
        const pendingMessages = await Message.find({
            isScheduled: true,
            isSent: false,
        }).sort({ scheduledSendTime: 1 });

        console.log(`Found ${pendingMessages.length} pending scheduled messages to process.`);

        pendingMessages.forEach(message => {
            if (!message.scheduledSendTime) return;
            
            if (message.scheduledSendTime <= new Date(now.getTime() + 10000)) { 
                (async () => {
                    try {
                        message.isSent = true;
                        message.isScheduled = false;
                        await message.save();
                        await deliverMessage(message);
                    } catch (err) {
                        console.error(`Error sending overdue message ${message._id}:`, err.message);
                    }
                })();
            } else {
                const job = schedule.scheduleJob(message._id.toString(), message.scheduledSendTime, async () => { 
                    const msgToSend = await Message.findOne({ _id: message._id, isScheduled: true, isSent: false });
                    if (msgToSend) {
                        msgToSend.isSent = true;
                        msgToSend.isScheduled = false;
                        await msgToSend.save();
                        await deliverMessage(msgToSend);
                    }
                });
                if (!job) console.error(`Failed to reschedule job for message ${message._id}`);
            }
        });

    } catch (error) {
        console.error("Error rescheduling pending messages:", error.message);
    }
};