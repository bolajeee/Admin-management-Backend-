import { create } from "zustand"
import toast from "react-hot-toast"
import { axiosInstance } from "../lib/axios"

export const useChatStore = create((set) => ({
    messages: [],
    users: [],
    selectUser: null,
    isUserLoading: false,
    isMessagesLoading: false,

    getUsers: async () => {
        set({ isUserLoading: true })
        try {
            const response = await axiosInstance.get("/auth/users")
            set({ users: response.data.users })
            toast.success("Users fetched successfully")
        } catch (error) {
            console.error("Error fetching users", error)
            toast.error("Error fetching users")
        } finally {
            set({ isUserLoading: false })
        }
    },

    getMessages: async (userId) => {
        set({ isMessagesLoading: true })
        try {
            const response = await axiosInstance.get(`/messages/${userId}`)
            set({ messages: response.data.messages })
            toast.success("Messages fetched successfully")
        } catch (error) {
            console.error("Error fetching messages", error)
            toast.error("Error fetching messages")
        } finally {
            set({ isMessagesLoading: false })
        }
    },

    setSelectedUser: (selectedUser) => {
        setSelectedUser(selectedUser)
    }
}))