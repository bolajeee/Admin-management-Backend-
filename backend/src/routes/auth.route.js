import express from "express";
import { signupUser, loginUser, logoutUser, updateProfile, checkAuthStatus } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup", signupUser);
router.post("/login",loginUser);
router.post("/logout", logoutUser);

//protected routes
router.put("/updateProfile", protectRoute, updateProfile)

router.get("/check", protectRoute, checkAuthStatus)

export default router;
