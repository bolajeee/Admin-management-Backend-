import { generateToken } from '../lib/utils/utils.js'
import User from '../models/user.model.js'
import bcrypt from "bcryptjs"
import cloudinary from "../lib/cloudinary.js"


export const signupUser = async (req, res) => {
    const { name, email, password } = req.body

    //validate the data
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please fill all the fields" })
    }

    //check if the user already exists
    const userExists = await User.findOne({ email })
    if (userExists) {
        return res.status(400).json({ message: "User already exists" })
    }

    try {
        //check if the password is strong enough
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character" })
        }

        //hash the password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        //create a new user
        const user = new User({
            name,
            email,
            password: hashedPassword,
        })

        //save the user to the database
        if (user) {
            //generate a token
            generateToken(user._id, res)
            await user.save()
            res.status(201).json({
                message: "User created successfully",
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture,
            })
        } else {
            res.status(400).json({ message: "Invalid user data" })
        }
    } catch (error) {
        console.error(error, "Error in signupUserController")
        res.status(500).json({ message: "Internal server error" })
    }
}

export const loginUser = async (req, res) => {
    const { email, password } = req.body

    //validate the data
    if (!email || !password) {
        return res.status(400).json({ message: "Please fill all the fields" })
    }

    //check if the user exists
    try {
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password"
            })
        }

        //check if the password is correct
        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid email or password" })
        }

        generateToken(user._id, res)

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profilepic: user.profilePicture
        })
    } catch (error) {
        console.error("Error in login controller", error.message)
    }
}

export const logoutUser = (req, res) => {
    try {
        res.cookie("token", "", {
            maxAge: 0,
        })
        res.status(200).json({ message: "Logout successful" })
    } catch (error) {
        console.error(`"error in logout controller." ${error.message}`)
        res.status(500).json({ message: "Internal server error" })
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { profilePic } = req.body
        const userId = req.user._id

        if (!profilePic) {
            return res.status(400).json({ message: "Please fill all the fields" })
        }

        //upload the profile picture to cloudinary
        const uploadResponse = await cloudinary.uploader.upload(profilePic, {
            folder: "profilepics",
            width: 150,
            height: 150,
            crop: "fill",
        })

        const updatedProfile = await User.findByIdAndUpdate(
            userId,
            { profilePic: uploadResponse.secure_url },
            { new: true }
        )

        res.status(200).json({
            message: "Profile updated successfully",
            profilePic: updatedProfile.profilePic,
        })

    } catch (error) {
        console.error("Error in updateProfile controller:", error.message)
        res.status(500).json({ message: "Internal server error" })
    }
}


export const checkAuthStatus = async (req, res) => {
    try {
        res.status(200).json(req.user)
    } catch (error) {
        console.error(`"error in checkAuthStatus controller." ${error.message}`)
        res.status(500).json({ message: "Internal server error" })
    }
}