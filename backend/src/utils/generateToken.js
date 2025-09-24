import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    res.cookie("token", token, {
        httpOnly: true, // prevents client-side JS (xxs attack) from accessing the cookie
        secure: process.env.NODE_ENV !== "development", // prevents cookie from being sent over http
        sameSite: "strict", // prevents CSRF attacks
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return token;
}