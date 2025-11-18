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
      required: false, // Not required if it's a group message
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