import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    instanceId: {
      type: String,
      required: true,
      default: "blackbox.main.org", // Default server
      index: true,
    }
  },
  { timestamps: true }
);

userSchema.index({ email: 1, instanceId: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

export default User;