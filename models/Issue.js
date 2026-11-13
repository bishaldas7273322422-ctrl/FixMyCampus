 
const mongoose = require("mongoose");
const crypto = require("crypto");

const issueSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => crypto.randomUUID(),
        unique: true
    },

    ticketId: {
        type: String,
        required: true,
        unique: true
    },

    studentId: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        lowercase: true
    },

    title: {
        type: String,
        required: true
    },

    category: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true
    },

    location: {
        type: String,
        required: true
    },

    priority: {
        type: String,
        default: "Medium"
    },

    status: {
        type: String,
        enum: ["Pending", "In Progress", "Resolved", "Rejected"],
        default: "Pending"
    },

    photo: {
        type: String,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Issue", issueSchema);
