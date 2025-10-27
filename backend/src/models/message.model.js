import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    // +++ Add Scheduling Fields +++
    isScheduled: {
      type: Boolean,
      default: false,
    },
    scheduledSendTime: {
      type: Date,
      index: true, // Index for faster querying by the scheduler
    },
    // Change default to handle scheduled messages correctly
    isSent: {
       type: Boolean,
       default: true, // Will be overridden to false if scheduled
    },
    // +++++++++++++++++++++++++++++
  },
  { timestamps: true } // createdAt will mark when it was scheduled/sent initially
);

// Ensure index works well with isSent and isScheduled
messageSchema.index({ isScheduled: 1, isSent: 1, scheduledSendTime: 1 });


const Message = mongoose.model("Message", messageSchema);

export default Message;