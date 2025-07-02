import express from "express"
import { protectRoute } from "../middleware/auth.middleware.js"
import { getMessages, getUsers, sendMessage } from "../controllers/message.controller.js"

const router = express.Router()

router.get("/users", protectRoute, getUsers)
router.get("/userMessage/:id", protectRoute, getMessages)
router.post("/user/:id", protectRoute, sendMessage)

export default router