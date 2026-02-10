const db = require('../config/db');

// Cache object taake har bar DB query na karni paray
let surchargeCache = null;

exports.getFixedSurcharges = async () => {
    // Agar cache mein data hai to wahi return kar do (Optimization)
    if (surchargeCache) return surchargeCache;

    try {
        const [rows] = await db.query("SELECT * FROM fixed_surcharges");
        
        // Data ko vehicle_type ke hisab se map kar lein
        const mapping = {};
        rows.forEach(row => {
            mapping[row.vehicle_type] = {
                night: parseFloat(row.night_surcharge),
                meetGreet: parseFloat(row.meet_greet_surcharge),
                base: parseFloat(row.base_price)
            };
        });

        surchargeCache = mapping; // Cache update karein
        return mapping;
    } catch (err) {
        console.error("Error fetching fixed surcharges:", err.message);
        throw err;
    }
};

// Function to clear cache (agar aap DB update karein to isay call karein)
exports.refreshCache = () => { surchargeCache = null; };