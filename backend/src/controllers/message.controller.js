import Message from "../models/message.model.js";
import User from "../models/user.model.js";

export const getUsers = async (req, res) => {
    try {
        const loggedInUserId = req.user._id
        const filteredUsers = await User.find({_id: {$ne:loggedInUserId}}).select("-password")

        res.status(200).json(filteredUsers)
    } catch (error) {
        console.error("Error in getting Users: ", error.message)
        res.status(500).json({error: "internal server error"})
    }
}

export const getMessages = async (req, res) => {
    try{
        const {id:userToChatId} = req.params
        const myId = req.user._id

        const messages = await Message.find({
            $or:[
                {myId: myId, receiverId:userToChatId},
                {receiverId:userToChatId, myId: senderId}
            ]
        })

        res.status(200).json(messages)
    }  catch (error) {
        console.error("Error in getting Messages: ", error.message)
        res.status(500).json({error: "internal server error"})
    } 
}

export const sendMessage = async (req, res) => {
    try{
        const{text, image} = req.body
        const{id: receiverId} = req.params
        const senderId = req.user._id

        let imageUrl
        if(image){
            //upload to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image)
            imageUrl = uploadResponse.secure_url
        }

        const newMessage =new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        })

        await new Message.save()

        res.status(201).json(newMessage)

        //todo : realtime functionalify socket.io

    }catch(error){
        console.error("Error in sending Message: ", error.message)
        res.status(500).json({error: "internal server error"})
    }
}