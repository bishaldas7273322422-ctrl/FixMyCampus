 
require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { Readable } = require("stream");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

const connectDB = require("./config/database");
const User = require("./models/User");
const Issue = require("./models/Issue");

const { verifyToken, verifyAdmin } = require("./middleware/auth");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const UPLOAD_DIR = path.join(__dirname, "uploads");
const PUBLIC_DIR = path.join(__dirname, "public");

// Check required environment variables
if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
    console.error("ERROR: JWT_SECRET or MONGO_URI is missing.");
    process.exit(1);
}

if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
) {
    console.error("ERROR: Cloudinary credentials are missing.");
    process.exit(1);
}

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Create local folder for legacy photos
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files only
app.use(express.static(PUBLIC_DIR));

// Generate Ticket ID
function generateTicketID() {
    return `FMC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
}

// Cloudinary photo storage
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "fixmycampus/complaints",
        resource_type: "image",
        type: "authenticated",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        public_id: (req, file) =>
            `${Date.now()}-${crypto.randomUUID()}`
    }
});

// Multer upload configuration
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG and WEBP images are allowed."));
        }
    }
});

// Authentication routes
app.use("/api/auth", authRoutes);

// API home route
app.get("/api", (req, res) => {
    res.json({
        success: true,
        message: "FixMyCampus API is running!"
    });
});

// Submit complaint - STUDENT LOGIN REQUIRED
app.post(
    "/api/issues",
    verifyToken,
    upload.single("photo"),
    async (req, res) => {
        try {
            if (req.user.role !== "student") {
                return res.status(403).json({
                    success: false,
                    message: "Only students can submit complaints."
                });
            }

            const {
                category,
                title,
                description,
                location,
                priority
            } = req.body;

            if (!category || !title || !description || !location || !priority) {
                if (req.file) {
                    await cloudinary.uploader.destroy(req.file.filename, {
                        resource_type: "image",
                        type: "authenticated"
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: "Please fill in all required fields."
                });
            }

            const student = await User.findOne({
                id: req.user.id,
                role: "student"
            });

            if (!student) {
                if (req.file) {
                    await cloudinary.uploader.destroy(req.file.filename, {
                        resource_type: "image",
                        type: "authenticated"
                    });
                }

                return res.status(401).json({
                    success: false,
                    message: "Student account not found."
                });
            }

            const issue = await Issue.create({
                id: crypto.randomUUID(),
                studentId: student.id,
                ticketId: generateTicketID(),
                name: student.name,
                email: student.email,
                category,
                title,
                description,
                location,
                priority,

                // Store Cloudinary public ID, not a local file path
                photo: req.file ? req.file.filename : null,

                status: "Pending",
                createdAt: new Date(),
                updatedAt: new Date()
            });

            res.status(201).json({
                success: true,
                message: "Complaint submitted successfully!",
                issue
            });

        } catch (error) {
            console.error("Complaint submission error:", error);

            // Remove Cloudinary photo if database save fails
            if (req.file && req.file.filename) {
                try {
                    await cloudinary.uploader.destroy(req.file.filename, {
                        resource_type: "image",
                        type: "authenticated"
                    });
                } catch (deleteError) {
                    console.error("Cloudinary cleanup error:", deleteError.message);
                }
            }

            res.status(500).json({
                success: false,
                message: "Failed to submit complaint."
            });
        }
    }
);

// PUBLIC EXISTING COMPLAINTS
app.get("/api/issues/public", async (req, res) => {
    try {
        const { search, status, category, priority } = req.query;

        let issues = await Issue.find({})
            .select("id ticketId title category location priority status createdAt updatedAt -_id")
            .sort({ createdAt: -1 })
            .lean();

        if (search) {
            const keyword = String(search).toLowerCase();

            issues = issues.filter(issue =>
                [
                    issue.ticketId,
                    issue.title,
                    issue.location,
                    issue.category
                ].some(value =>
                    String(value || "").toLowerCase().includes(keyword)
                )
            );
        }

        if (status && status !== "All") {
            issues = issues.filter(issue => issue.status === status);
        }

        if (category && category !== "All") {
            issues = issues.filter(issue => issue.category === category);
        }

        if (priority && priority !== "All") {
            issues = issues.filter(issue => issue.priority === priority);
        }

        res.json({
            success: true,
            count: issues.length,
            issues
        });

    } catch (error) {
        console.error("Public complaints error:", error);

        res.status(500).json({
            success: false,
            message: "Could not load existing complaints."
        });
    }
});

// Get complaints - STUDENT SEES OWN, ADMIN SEES ALL
app.get("/api/issues", verifyToken, async (req, res) => {
    try {
        const { search, status, category, priority } = req.query;

        let filter = {};

        if (req.user.role === "admin") {
            filter = {};
        } else if (req.user.role === "student") {
            filter = { studentId: req.user.id };
        } else {
            return res.status(403).json({
                success: false,
                message: "Access denied."
            });
        }

        let issues = await Issue.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        if (search) {
            const keyword = String(search).toLowerCase();

            issues = issues.filter(issue =>
                [
                    issue.ticketId,
                    issue.name,
                    issue.title,
                    issue.location,
                    issue.category
                ].some(value =>
                    String(value || "").toLowerCase().includes(keyword)
                )
            );
        }

        if (status && status !== "All") {
            issues = issues.filter(issue => issue.status === status);
        }

        if (category && category !== "All") {
            issues = issues.filter(issue => issue.category === category);
        }

        if (priority && priority !== "All") {
            issues = issues.filter(issue => issue.priority === priority);
        }

        res.json({
            success: true,
            count: issues.length,
            issues
        });

    } catch (error) {
        console.error("Get complaints error:", error);

        res.status(500).json({
            success: false,
            message: "Could not load complaints."
        });
    }
});

// SECURE PHOTO ACCESS
// Admin can view all photos.
// Students can view only their own complaint photos.
app.get("/api/issues/:id/photo", verifyToken, async (req, res) => {
    try {
        const issue = await Issue.findOne({
            id: req.params.id
        }).lean();

        if (!issue || !issue.photo) {
            return res.status(404).json({
                success: false,
                message: "Complaint photo not found."
            });
        }

        if (
            req.user.role !== "admin" &&
            (
                req.user.role !== "student" ||
                issue.studentId !== req.user.id
            )
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view this photo."
            });
        }

        // Support old local photo paths
        if (issue.photo.startsWith("/uploads/")) {
            const filename = path.basename(issue.photo);
            const photoPath = path.join(UPLOAD_DIR, filename);

            if (!fs.existsSync(photoPath)) {
                return res.status(404).json({
                    success: false,
                    message: "Old photo file is unavailable."
                });
            }

            res.setHeader("Cache-Control", "private, no-store");
            return res.sendFile(photoPath);
        }

        // Generate a signed authenticated Cloudinary URL
        const photoUrl = cloudinary.url(issue.photo, {
            secure: true,
            resource_type: "image",
            type: "authenticated",
            sign_url: true
        });

        // Fetch photo on the server, so the client does not receive
        // the Cloudinary URL directly.
        const response = await fetch(photoUrl);

        if (!response.ok) {
            console.error("Cloudinary photo response:", response.status);

            return res.status(404).json({
                success: false,
                message: "Cloudinary photo is unavailable."
            });
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const imageBuffer = Buffer.from(await response.arrayBuffer());

        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Length", imageBuffer.length);
        res.setHeader("Cache-Control", "private, no-store");

        res.send(imageBuffer);

    } catch (error) {
        console.error("Photo access error:", error);

        res.status(500).json({
            success: false,
            message: "Could not load complaint photo."
        });
    }
});

// Public Ticket Tracking
app.get("/api/issues/ticket/:ticketId", async (req, res) => {
    try {
        const issue = await Issue.findOne({
            ticketId: req.params.ticketId
        })
        .select("ticketId title category location priority status createdAt updatedAt -_id")
        .lean();

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: "Complaint not found. Please check your Ticket ID."
            });
        }

        res.json({
            success: true,
            issue
        });

    } catch (error) {
        console.error("Ticket tracking error:", error);

        res.status(500).json({
            success: false,
            message: "Could not track complaint."
        });
    }
});

// Update complaint status - ADMIN ONLY
app.patch(
    "/api/issues/:id/status",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
        try {
            const { status } = req.body;

            const allowedStatuses = [
                "Pending",
                "In Progress",
                "Resolved"
            ];

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status."
                });
            }

            const issue = await Issue.findOneAndUpdate(
                { id: req.params.id },
                {
                    status,
                    updatedAt: new Date()
                },
                { new: true, runValidators: true }
            );

            if (!issue) {
                return res.status(404).json({
                    success: false,
                    message: "Complaint not found."
                });
            }

            res.json({
                success: true,
                message: "Complaint status updated successfully!",
                issue
            });

        } catch (error) {
            console.error("Status update error:", error);

            res.status(500).json({
                success: false,
                message: "Could not update complaint status."
            });
        }
    }
);

// Admin dashboard statistics - ADMIN ONLY
app.get(
    "/api/admin/stats",
    verifyToken,
    verifyAdmin,
    async (req, res) => {
        try {
            const issues = await Issue.find({})
                .select("status priority -_id")
                .lean();

            res.json({
                success: true,
                total: issues.length,
                pending: issues.filter(i => i.status === "Pending").length,
                inProgress: issues.filter(i => i.status === "In Progress").length,
                resolved: issues.filter(i => i.status === "Resolved").length,
                highPriority: issues.filter(i => i.priority === "High").length
            });

        } catch (error) {
            console.error("Statistics error:", error);

            res.status(500).json({
                success: false,
                message: "Could not load dashboard statistics."
            });
        }
    }
);

// Handle upload and server errors
app.use((err, req, res, next) => {
    console.error("Server error:", err.message);

    res.status(400).json({
        success: false,
        message: err.message || "Something went wrong."
    });
});

// Connect MongoDB before starting server
async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`FixMyCampus server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

startServer();
