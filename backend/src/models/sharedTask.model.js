import mongoose from "mongoose";

const sharedTaskSchema = new mongoose.Schema(
  {
    text: { 
        type: String, 
        required: true 
    },
    isCompleted: { 
        type: Boolean, 
        default: false 
    },
    completedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        default: null 
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    // Context
    isGroup: { 
        type: Boolean, 
        default: false 
    },
    groupId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Group" 
    },
    // For DMs, we store both users to query easily
    participants: [
        { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ],
  },
  { timestamps: true }
);

const SharedTask = mongoose.model("SharedTask", sharedTaskSchema);

export default SharedTask;