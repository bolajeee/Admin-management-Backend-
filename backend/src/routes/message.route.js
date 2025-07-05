import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js"
import { getEmployeeCount, getMessages, getRecentMessages, getTodayMessageCount, getUsers, sendMessage } from "../controllers/message.controller.js"
import multer from 'multer';

const router = express.Router()

const upload = multer({ dest: 'uploads/' }); // or configure to memory if needed

router.get("/users", protectRoute, getUsers)
router.get("/userMessage/:id", protectRoute, getMessages)
router.post('/user/:id', upload.single('image'), protectRoute, sendMessage);

router.get("/employees/count", getEmployeeCount);
router.get("/recent", protectRoute, getRecentMessages);
router.get("/today", getTodayMessageCount);

export default router