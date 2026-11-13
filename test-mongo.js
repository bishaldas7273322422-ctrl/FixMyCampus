
require("dotenv").config();

const mongoose = require("mongoose");

async function testConnection() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is missing from .env");
        }

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected Successfully!");
        console.log("Database:", mongoose.connection.name);

        await mongoose.disconnect();
        console.log("Connection test completed.");

    } catch (error) {
        console.error("MongoDB Connection Failed:");
        console.error(error.message);
        process.exitCode = 1;
    }
}

testConnection();
