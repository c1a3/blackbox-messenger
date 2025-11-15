import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import schedule from 'node-schedule';
import moment from 'moment-timezone'; // Use moment-timezone

// --- Helper function to actually send/emit a message ---
const deliverMessage = async (message) => {
    try {
        const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", message);
        }
        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        if (senderSocketId) {
            io.to(senderSocketId).emit("newMessage", message);
        }
        console.log(`Delivered message ${message._id} at ${new Date()}`);

    } catch (error) {
        console.error(`Error delivering message ${message._id}:`, error.message);
    }
};
// --- End Helper ---


export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
        res.status(200).json(filteredUsers);
      } catch (error) {
        console.error("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ error: "Internal server error" });
      }
};

export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
          $or: [
            { senderId: myId, receiverId: userToChatId },
            { senderId: userToChatId, receiverId: myId },
          ],
           // --- Only fetch messages that are sent ---
           isSent: true
           // ----------------------------------------
        });

        res.status(200).json(messages);
      } catch (error) {
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
      }
};

// --- Modified sendMessage using moment-timezone with explicit format ---
export const sendMessage = async (req, res) => {
  try {
    const { text, image, scheduledSendTime } = req.body; // scheduledSendTime is a string like "YYYY-MM-DDTHH:mm"
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    let scheduleDateUTC = null;
    const timeZone = 'Asia/Kolkata'; // Define the user's time zone (IST)

    if (scheduledSendTime) {
        try {
            // The frontend sends a standard ISO string (UTC). Parse it directly.
            const scheduledMoment = moment(scheduledSendTime); // This correctly parses the ISO string

            if (!scheduledMoment.isValid()) {
                 console.error(`Invalid date format or value received: ${scheduledSendTime}`);
                 return res.status(400).json({ error: "Invalid scheduled time format or value provided" });
            }

            // *** FIX FOR LATENCY ***
            // Check if time is in the past, allowing a 2-second buffer for latency
            if (scheduledMoment.isSameOrBefore(moment().subtract(2, 'seconds'))) {
            // *** END FIX ***
                console.warn(`Scheduled time ${scheduledSendTime} (${timeZone}) is in the past.`);
                return res.status(400).json({ error: "Scheduled time must be in the future." });
            }

            // Convert the moment object to a standard JavaScript Date object (UTC)
            scheduleDateUTC = scheduledMoment.toDate();

            console.log(`Received schedule request for ${scheduledSendTime} (${timeZone}), scheduling for ${scheduleDateUTC.toISOString()} (UTC)`);
        } catch (parseError) {
             console.error("Error processing schedule time with moment-timezone:", parseError);
             return res.status(500).json({ error: "Internal server error processing schedule time." });
        }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      isScheduled: !!scheduleDateUTC,
      scheduledSendTime: scheduleDateUTC, // Store the calculated UTC date object
      isSent: !scheduleDateUTC,
    });

    await newMessage.save();

    if (scheduleDateUTC) {
        // Schedule the job using the UTC date object
        const job = schedule.scheduleJob(newMessage._id.toString(), scheduleDateUTC, async () => {
             console.log(`Executing scheduled job for message ${newMessage._id} at ${new Date()}`);
            const msgToSend = await Message.findOne({ _id: newMessage._id, isScheduled: true, isSent: false });
            if (msgToSend) {
                console.log(`Found message ${msgToSend._id}, marking as sent.`);
                msgToSend.isSent = true;
                msgToSend.isScheduled = false;
                await msgToSend.save();
                await deliverMessage(msgToSend);
            } else {
                 console.log(`Scheduled message ${newMessage._id} not found or already sent/cancelled during job execution.`);
            }
        });

        if (!job) {
             console.error(`Failed to schedule job for message ${newMessage._id}`);
             await Message.deleteOne({ _id: newMessage._id });
             return res.status(500).json({ error: "Failed to schedule message send time." });
        }

        console.log(`Job scheduled for message ${newMessage._id} at ${scheduleDateUTC.toISOString()}`);


        // Respond with confirmation showing the time formatted back into IST
        const formattedTime = moment(scheduleDateUTC).tz(timeZone).format('YYYY-MM-DD h:mm A z'); // More readable format
        res.status(202).json({ message: `Message scheduled successfully for ${formattedTime}`, scheduledMessage: newMessage });

    } else {
        // Send immediately
        console.log(`Sending message ${newMessage._id} immediately.`);
        await deliverMessage(newMessage);
        res.status(201).json(newMessage);
    }

  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
// --- End Modified sendMessage ---


export const deleteMessage = async (req, res) => {
     try {
        const { messageId } = req.params;
        const { deleteType } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);

        if (!message) {
          return res.status(404).json({ error: "Message not found" });
        }

        // --- Cancel Scheduled Job if deleting for everyone before sending ---
        if (deleteType === "everyone" && message.isScheduled && !message.isSent) {
             const jobName = message._id.toString();
             const job = schedule.scheduledJobs[jobName];
             if (job) {
                 job.cancel();
                 console.log(`Cancelled scheduled job for message ${messageId}`);
             } else {
                 console.log(`Could not find scheduled job for message ${messageId} to cancel.`);
             }
        }
        // ---------------------------------------------------------------------

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
              isScheduled: false, // Ensure it's not considered scheduled anymore
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

        if (!updatedMessage) {
           return res.status(404).json({ error: "Message not found after update attempt" });
        }

        // Emit event to involved users
        const receiverSocketId = getReceiverSocketId(message.receiverId);
        const senderSocketId = getReceiverSocketId(userId);

        const deletionInfo = {
           messageId: message._id,
           deleteType: deleteType,
           senderId: userId,
           receiverId: message.receiverId,
           updatedText: deleteType === "everyone" ? updatedMessage.text : null,
        };

        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageDeleted", deletionInfo);
        }
         if (senderSocketId) {
          io.to(senderSocketId).emit("messageDeleted", deletionInfo);
        }

        res.status(200).json({ message: "Message deleted successfully", updatedMessage });

      } catch (error) {
        console.log("Error in deleteMessage controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
      }
};

// --- Function to schedule pending messages on server start ---
export const schedulePendingMessages = async () => {
    try {
        const now = new Date();
        // Find ALL pending messages that haven't been sent
        const pendingMessages = await Message.find({
            isScheduled: true,
            isSent: false,
        }).sort({ scheduledSendTime: 1 });

        console.log(`Found ${pendingMessages.length} pending scheduled messages to process.`);

        pendingMessages.forEach(message => {
            if (!message.scheduledSendTime) {
                 console.log(`Skipping message ${message._id}: No scheduledSendTime found.`);
                 return; // Skip if time is somehow missing
            }
            
            // Check if the scheduled time is in the past (or very close to now, e.g., 10s buffer)
            if (message.scheduledSendTime <= new Date(now.getTime() + 10000)) { 
                console.log(`Immediately sending overdue message ${message._id} scheduled for ${message.scheduledSendTime.toISOString()}`);
                // Send it right now in an async IIFE
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
                // It's in the future, schedule it normally
                console.log(`Rescheduling message ${message._id} for ${message.scheduledSendTime.toISOString()}`);
                const job = schedule.scheduleJob(message._id.toString(), message.scheduledSendTime, async () => { 
                    console.log(`Executing rescheduled job for message ${message._id} at ${new Date()}`);
                    const msgToSend = await Message.findOne({ _id: message._id, isScheduled: true, isSent: false });
                    if (msgToSend) {
                        console.log(`Found rescheduled message ${msgToSend._id}, marking as sent.`);
                        msgToSend.isSent = true;
                        msgToSend.isScheduled = false;
                        await msgToSend.save();
                        await deliverMessage(msgToSend);
                    } else {
                         console.log(`Rescheduled message ${message._id} not found or already sent/cancelled during job execution.`);
                    }
                });
                if (!job) {
                     console.error(`Failed to reschedule job for message ${message._id}`);
                }
            }
        });

    } catch (error) {
        console.error("Error rescheduling pending messages:", error.message);
    }
};
