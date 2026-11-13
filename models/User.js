
const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => crypto.randomUUID(),
        unique: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["student", "admin"],
        default: "student"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("User", userSchema);
