const db = require('../config/db');

exports.calculateHourlyPrice = async (req, res) => {
    try {
        // vehicleType ab implicitly Sedan/SUV controller se pass ho kar aayega
        const { hours, vehicleType, meetAndGreet = false } = req.body;
        
        // 1. Minimum 2 hours rule
        const inputHours = parseFloat(hours) || 0;
        const appliedHours = Math.max(inputHours, 2); 

        // 2. Fetch Rate from DB (Sedan: $83, SUV: $95, First Class: $107, Sprinter: $230)
        const [rateRows] = await db.query(
            `SELECT price_per_hour FROM hourly_rates WHERE vehicle_type = ?`, 
            [vehicleType]
        );
        
        if (rateRows.length === 0) {
            return res.status(404).json({ error: `Hourly rate not found for: ${vehicleType}` });
        }
        
        const pricePerHour = parseFloat(rateRows[0].price_per_hour);
        
        // 3. Simple Calculation (As per rules: No Night, No Urgent)
        let grossCharge = appliedHours * pricePerHour;

        // 4. Only Meet & Greet applies if selected ($35)
        if (meetAndGreet === true || meetAndGreet === 'true') {
            grossCharge += 35.00;
        }

        // 5. Final GST (13%) & Net Price
        const gst = grossCharge * 0.13;
        const netPrice = grossCharge + gst;

        // Final Response
        res.json({
            type: 'hourly',
            vehicleMatched: vehicleType,
            appliedHours: appliedHours,
            hourlyRate: pricePerHour,
            grossCharge: parseFloat(grossCharge.toFixed(2)),
            gst: parseFloat(gst.toFixed(2)),
            netPrice: parseFloat(netPrice.toFixed(2)),
            note: "No surcharges (night/urgent) applied for hourly booking"
        });

    } catch (err) { 
        console.error("Hourly Central Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" }); 
    }
};