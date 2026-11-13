
const mongoose = require("mongoose");

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected Successfully!");
        console.log("Database:", mongoose.connection.name);

    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);
        process.exit(1);
    }
}

module.exports = connectDB;
