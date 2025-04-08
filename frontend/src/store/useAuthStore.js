import { create } from "zustand"
import { axiosInstance } from "../lib/axios"
import toast from "react-hot-toast"

export const useAuthStore = create((set) => ({
    authUser: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,

    isCheckingAuth: true,

    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("/auth/check")
            set({ authUser: res.data })
        } catch (error) {
            console.error("Error in checkAuth:", error)
            set({ authUser: null })
        } finally {
            set({ isCheckingAuth: false })
        }
    },

    signUp: async (formData) => {
        set({isSigningUp: true})
        try {
            const res = await axiosInstance.post("/auth/signup", formData)
            set({ authUser: res.data })
            toast.success("Signup successful")
        } catch (error) {
            console.error("Error in signUp:", error.response.data.message)
            toast.error("Signup failed")
        }finally {
            set({isSigningUp: false})
        }
    },

    logout: async () => {
        try{
            await axiosInstance.post("/auth/logout")
            set({ authUser: null })
            toast.success("Logout successful")
        }catch(error){
            console.error("Error in logout:", error)
            toast.error("Logout failed")
        }
    },

    login: async(formData) => {
        set({isLoggingIn: true})
        try {
            const res = await axiosInstance.post("/auth/login", formData)
            set({ authUser: res.data })
            toast.success("Login successful")
        } catch (error) {
            console.error("Error in login:", error.response.data.message)
            toast.error("Login failed")
        }finally {
            set({isLoggingIn: false})
        }
    }

    
}))