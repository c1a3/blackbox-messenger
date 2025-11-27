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
      required: false,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: false,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    isEphemeral: {
      type: Boolean,
      default: false,
    },
    // NEW: Store the duration (in seconds)
    ephemeralDuration: {
      type: Number,
      default: 5, 
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    isScheduled: {
      type: Boolean,
      default: false,
    },
    scheduledSendTime: {
      type: Date,
      index: true,
    },
    isSent: {
       type: Boolean,
       default: true,
    },
  },
  { timestamps: true }
);

messageSchema.index({ isScheduled: 1, isSent: 1, scheduledSendTime: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;