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
        // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

        // if (!passwordRegex.test(password)) {
        //     return res.status(400).json({ message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character" })
        // }

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
        console.error(error, "Error in signup User Controller")
        res.status(500).json({ message: "Internal server error" })
    }
}

export const loginUser = async (req, res) => {
    const { email, password } = req.body || req.body.body

    console.log("Login data", req.body)
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

        //check the need to gen token again?
        generateToken(user._id, res)

        res.status(200).json({
            _id: user._id,
            email: user.email,
            profilepic: user.profilePicture
        })
    } catch (error) {
        console.error("Error in login controller", error.message)
        console.log()
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
    async function handleUpload(file) {
        return await cloudinary.uploader.upload(file, { resource_type: "auto" });
    }

    try {
        const userId = req.user._id;

        if (!req.file) {
            return res.status(400).json({ message: "Please upload a profile picture" });
        }

        // Convert to base64 data URI
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        const cldRes = await handleUpload(dataURI);

        if (cldRes) {
            const updatedProfile = await User.findByIdAndUpdate(
                userId,
                { profilePicture: cldRes.secure_url },
                { new: true }
            );

            return res.status(200).json({
                message: "Profile updated successfully",
                profilePicture: updatedProfile.profilePicture,
            });
        }
    } catch (error) {
        console.error("Error in updateProfile controller:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const checkAuthStatus = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized. Please login." });
    }
    res.status(200).json(req.user);
  } catch (error) {
    console.error(`Error in checkAuthStatus: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const createUser = async (req, res) => {
  const { name, email, role, password } = req.body;
  
  try {
    // Validation and checks
    if (!name || !email || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

     //hash the password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash("default", salt)

    // Create new employee user
    const newUser = new User({
      name,
      email,
      role, // Role could be 'employee', 'admin', etc.
      password: hashedPassword, // Don't forget to hash the password
    });

    await newUser.save();

    return res.status(201).json({ message: 'Employee added successfully', user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add employee' });
  }
};
