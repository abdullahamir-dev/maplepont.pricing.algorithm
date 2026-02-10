// controllers/sprinterPricingController.js

exports.calculateSprinterDistance = async (req, res, next) => {
    // 1. Hourly Logic Connection (Sirf yeh part entertain hoga)
    if (req.body.hours && req.body.hours > 0) {
        req.body.vehicleType = 'sprinter'; 
        return next(); // Centralized hourly controller handles the rest ($230/hr)
    }

    // 2. Point-to-Point Restriction Handling
    // Agar KM request aati hai, toh calculation nahi hogi
    return res.status(403).json({
        vehicle: "sprinter",
        status: "Unavailable",
        message: "Sprinter service is exclusively available for hourly bookings. Point-to-point service is not entertained at this time.",
        suggestion: "Please book for a minimum duration to proceed with a Sprinter."
    });
};