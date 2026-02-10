// middleware/authMiddleware.js

exports.verifyPrivateKey = (req, res, next) => {
    const clientKey = req.headers['x-private-key'] || req.body.privateKey;
    const serverKey = process.env.SERVER_PRIVATE_KEY;

    // 1. Check if key is provided
    if (!clientKey) {
        return res.status(401).json({
            error: "Unauthorized Access",
            message: "Private access key is missing. Please provide a valid key to proceed."
        });
    }

    // 2. Validate the key/hash
    if (clientKey !== serverKey) {
        return res.status(403).json({
            error: "Security Violation",
            message: "Invalid private key. Access denied for this requester."
        });
    }

    // 3. Success: Pass request to the router
    next();
};