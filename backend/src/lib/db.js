import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const mongoUri = process.env.NODE_ENV === 'test' ? process.env.MONGO_URI_TEST : process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.log(error);
    }
};