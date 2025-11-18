import Group from "../models/group.model.js";
import cloudinary from "../lib/cloudinary.js";

export const createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    const admin = req.user._id;

    if (!name || !members || members.length === 0) {
      return res.status(400).json({ message: "Name and at least one member are required" });
    }

    const allMembers = [...new Set([...members, admin.toString()])];

    const newGroup = new Group({
      name,
      members: allMembers,
      admin,
    });

    await newGroup.save();
    await newGroup.populate("members", "-password");

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error in createGroup:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ members: userId }).populate("members", "-password");
    res.status(200).json(groups);
  } catch (error) {
    console.error("Error in getGroups:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateGroupProfile = async (req, res) => {
    try {
        const { image } = req.body;
        const { id: groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        // Check if user is admin (optional: allow any member to update?)
        // Let's restrict to admin for better control
        if (group.admin.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Only admins can update group settings" });
        }

        let imageUrl = group.image;
        if (image) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const updatedGroup = await Group.findByIdAndUpdate(
            groupId,
            { image: imageUrl },
            { new: true }
        ).populate("members", "-password");

        res.status(200).json(updatedGroup);

    } catch (error) {
        console.error("Error in updateGroupProfile:", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};