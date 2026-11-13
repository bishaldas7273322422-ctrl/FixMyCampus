 
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");

const router = express.Router();

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
}

// STUDENT REGISTRATION
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required."
            });
        }

        if (typeof password !== "string" || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = await User.create({
            id: crypto.randomUUID(),
            name: String(name).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "student"
        });

        const token = generateToken(newUser);

        res.status(201).json({
            success: true,
            message: "Registration successful!",
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        res.status(500).json({
            success: false,
            message: "Registration failed."
        });
    }
});

// STUDENT AND ADMIN LOGIN
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        // ADMIN LOGIN
        const adminEmail = String(process.env.ADMIN_EMAIL || "")
            .trim()
            .toLowerCase();

        if (
            adminEmail &&
            normalizedEmail === adminEmail &&
            process.env.ADMIN_PASSWORD &&
            password === process.env.ADMIN_PASSWORD
        ) {
            const admin = {
                id: "admin",
                name: "Administrator",
                email: adminEmail,
                role: "admin"
            };

            return res.json({
                success: true,
                message: "Admin login successful!",
                token: generateToken(admin),
                user: admin
            });
        }

        // STUDENT LOGIN FROM MONGODB
        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed."
        });
    }
});

module.exports = router;
