
require("dotenv").config();

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const User = require("./models/User");

async function migrateUsers() {
    try {
        const dbPath = path.join(__dirname, "db.json");

        if (!fs.existsSync(dbPath)) {
            throw new Error("db.json file not found!");
        }

        const data = JSON.parse(fs.readFileSync(dbPath, "utf8"));

        if (!Array.isArray(data.users)) {
            throw new Error("Users array not found in db.json!");
        }

        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB Connected!");

        for (const user of data.users) {
            const existingUser = await User.findOne({
                $or: [
                    { id: user.id },
                    { email: user.email.toLowerCase() }
                ]
            });

            if (existingUser) {
                console.log("Already exists:", user.email);
                continue;
            }

            await User.create({
                id: user.id,
                name: user.name,
                email: user.email,
                password: user.password,
                role: user.role,
                createdAt: user.createdAt
            });

            console.log("Migrated:", user.email);
        }

        console.log("\nUser migration completed successfully!");

    } catch (error) {
        console.error("Migration failed:", error.message);
    } finally {
        await mongoose.disconnect();
    }
}

migrateUsers();
