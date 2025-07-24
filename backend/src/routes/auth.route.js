import express from "express";
import { signupUser, loginUser, logoutUser, updateProfile, checkAuthStatus, deleteUser, createUser } from "../controllers/auth.controller.js";
import { authorize, protectRoute } from "../middleware/auth.middleware.js";


import multer from "multer";
import { trackLogin, trackLoginFailure, trackActivity } from "../middleware/activity.middleware.js";

const router = express.Router();


const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/signup", signupUser);



router.post("/login", trackLoginFailure, loginUser, trackLogin);
router.post("/logout", logoutUser);

//protected routes




router.put("/updateProfile", protectRoute, upload.single('profilePic'), updateProfile);
router.get("/check", protectRoute, checkAuthStatus);
router.delete("/deleteUser/:id", protectRoute, authorize(['admin']), deleteUser);
router.post("/create", protectRoute, authorize(['admin']), createUser);


export default router;
