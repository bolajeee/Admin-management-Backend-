import express from "express";
import { signupUser, loginUser, logoutUser, updateProfile, checkAuthStatus, deleteUser, createUser } from "../controllers/auth.controller.js";
import { authorize, protectRoute } from "../middleware/auth.middleware.js";
import { sanitizeInput } from "../middleware/sanitization.middleware.js";


import multer from "multer";
import path from "path";
import { trackLogin, trackLoginFailure, trackActivity } from "../middleware/activity.middleware.js";

const router = express.Router();


const upload = multer({
  storage: multer.diskStorage({}),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  },
});

router.post("/signup", sanitizeInput, signupUser);
router.post("/login", sanitizeInput, trackLoginFailure, loginUser, trackLogin);
router.post("/logout", logoutUser);

//protected routes




router.put("/updateProfile", sanitizeInput, protectRoute, upload.single('profilePic'), updateProfile);
router.get("/check", protectRoute, checkAuthStatus);
router.delete("/deleteUser/:id", sanitizeInput, protectRoute, authorize(['admin']), deleteUser);
router.post("/create", sanitizeInput, protectRoute, authorize(['admin']), createUser);


export default router;
