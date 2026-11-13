 
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("./models/User");

async function verifyUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const users = await User.find(
            {},
            { _id: 0, id: 1, name: 1, email: 1, role: 1 }
        ).lean();

        console.log("\nUsers stored in MongoDB:");
        console.table(users);

        console.log("Total users:", users.length);

    } catch (error) {
        console.error("Verification failed:", error.message);
    } finally {
        await mongoose.disconnect();
    }
}

verifyUsers();
