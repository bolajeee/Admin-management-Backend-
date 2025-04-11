import express from "express";
import { signupUser, loginUser, logoutUser, updateProfile, checkAuthStatus } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import multer from "multer"

const router = express.Router();
const storage = multer.memoryStorage()
const upload = multer({ storage })

router.post("/signup", signupUser);
router.post("/login",loginUser);
router.post("/logout", logoutUser);

//protected routes
router.put("/updateProfile", protectRoute, upload.single('profilePic'), updateProfile)

router.get("/check", protectRoute, checkAuthStatus)

export default router;
