import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
    console.log('generateToken: JWT_SECRET', process.env.JWT_SECRET);
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    console.log('generateToken: NODE_ENV', process.env.NODE_ENV);
    if (process.env.NODE_ENV === 'test') {
        // Mock res.cookie for testing purposes
        res.cookie = (name, value, options) => {
            // Do nothing or log for debugging
        };
    } else {
        res.cookie("token", token, {
            httpOnly: true, //prevents client-side JS (xxs attack) from accessing the cookie
            secure: process.env.NODE_ENV !== "development", //prevents cookie from being sent over http
            sameSite: "strict", //prevents CSRF attacks
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    }
}