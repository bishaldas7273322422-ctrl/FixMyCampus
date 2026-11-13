
const jwt = require("jsonwebtoken");

// Check whether the user is logged in
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Please login first."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token. Please login again."
        });
    }
}

// Allow only admin users
function verifyAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin permission required."
        });
    }

    next();
}

module.exports = {
    verifyToken,
    verifyAdmin
};
