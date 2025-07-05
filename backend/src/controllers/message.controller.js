import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getUsers = async (req, res) => {
    try {
        const loggedInUserId = req.user._id
        const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password")

        res.status(200).json(filteredUsers)
    } catch (error) {
        console.error("Error in getting Users: ", error.message)
        res.status(500).json({ error: "internal server error" })
    }
}

export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { sender: myId, receiver: userToChatId },
                { sender: userToChatId, receiver: myId }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json({ messages });

    } catch (error) {
        console.error("Error in getting Messages: ", error.message);
        res.status(500).json({ error: "internal server error" });
    }
};

export const sendMessage = async (req, res) => {

    try {
        const { text } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        let imageUrl;

        if (req.file && req.file.path) {
            const uploadResponse = await cloudinary.uploader.upload(req.file.path);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            sender: senderId,
            receiver: receiverId,
            text,
            image: imageUrl,
        });

        await newMessage.save();

        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error in sending Message: ", error.message);
        res.status(500).json({ error: "internal server error" });
    }
};

export const getEmployeeCount = async (req, res) => {
    try {
        const count = await User.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getRecentMessages = async (req, res) => {
    try {
        // Fetch the 10 most recent messages, newest first
        const messages = await Message.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('sender', 'name email profilePicture')
            .populate('receiver', 'name email profilePicture');
        res.status(200).json({ messages });
    } catch (error) {
        console.error("Error in getting recent messages: ", error.message);
        res.status(500).json({ error: "internal server error" });
    }
};

export const getTodayMessageCount = async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const count = await Message.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};