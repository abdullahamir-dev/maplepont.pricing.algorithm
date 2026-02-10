const db = require('../config/db');
const surchargeController = require('./surchargeController');


exports.calculateSuvDistance = async (req, res, next) => {
    // 1. Implicit Hourly Logic (SUV Type set kar ke next kar dega)
    if (req.body.hours && req.body.hours > 0) {
        req.body.vehicleType = 'suv';
        return next();
    }

    try {
        const inputKm = parseFloat(req.body.km) || 0;
        const { lateNightSurcharge = false, urgentHour = 0, meetAndGreet = false } = req.body;

        // 2. Database se Range uthana
        let [rates] = await db.query(
            `SELECT * FROM rates_suv WHERE ? >= min_km AND ? <= max_km LIMIT 1`,
            [inputKm, inputKm]
        );

        let sheetPrice = 0;
        let rateRow;

        // 3. Range Handling (Exact match vs Interpolation)
        if (rates.length === 0) {
            const [lastRange] = await db.query(`SELECT * FROM rates_suv ORDER BY max_km DESC LIMIT 1`);
            if (lastRange.length > 0 && inputKm > parseFloat(lastRange[0].max_km)) {
                rateRow = lastRange[0];
                sheetPrice = parseFloat(rateRow.total_range_price) + ((inputKm - rateRow.max_km) * rateRow.price_per_km);
            } else {
                return res.status(404).json({ error: "Range not found" });
            }
        } else {
            rateRow = rates[0];
            if (inputKm === parseFloat(rateRow.max_km)) {
                sheetPrice = parseFloat(rateRow.total_range_price);
            } else {
                const [prev] = await db.query(`SELECT total_range_price FROM rates_suv WHERE max_km < ? ORDER BY max_km DESC LIMIT 1`, [rateRow.min_km]);
                const prevTotal = prev.length > 0 ? parseFloat(prev[0].total_range_price) : 0;
                // SUV Fix for 0-range handling
                const startOfRange = parseFloat(rateRow.min_km) > 0 ? parseFloat(rateRow.min_km) - 1 : 0;
                sheetPrice = prevTotal + ((inputKm - startOfRange) * rateRow.price_per_km);
            }
        }

        //
        const allSurcharges = await surchargeController.getFixedSurcharges();
        const fixedSurcharges = allSurcharges['suv'];
        //

        // 4. Pure Gross ($43.75 Base + Sheet) & Floor Check ($83.34)
        let pureGross = sheetPrice + fixedSurcharges.base;
        if (inputKm <= 10 && pureGross < 83.34) {
            pureGross = 83.34; // SUV Floor Rule
        }

        // 5. Urgent Surcharge (Sedan logic synchronized)
        let urgentValue = 0;
        let urgentString = "N/A";
        if (parseFloat(urgentHour) > 0) {
            // Aapke itne saare if-else ki jagah sirf ye 1 line:
            let effectiveHour = Math.ceil(urgentHour);
            if (effectiveHour > 12) effectiveHour = 12;
            // const effectiveHour = urgentHour > 12 ? 12 : urgentHour;
            const [urgentRow] = await db.query("SELECT percentage FROM urgent_surcharges WHERE hour_threshold = ?", [effectiveHour]);
            if (urgentRow.length > 0) {
                const perc = parseFloat(urgentRow[0].percentage);
                urgentValue = pureGross * (perc / 100);
                urgentString = `$${urgentValue.toFixed(2)} (${perc}%)`;
            }
        }

        

        // 6. Fixed Add-ons (Night: $14.30, M&G: $35.00)
        let grossCharge = pureGross;
        if (lateNightSurcharge) grossCharge += fixedSurcharges.night;
        if (meetAndGreet) grossCharge += fixedSurcharges.meetGreet;

        // 7. Final Tax (13%) & Net Price
        const subtotalForTax = grossCharge + urgentValue;
        const gst = subtotalForTax * 0.13;
        const netPrice = subtotalForTax + gst;

        res.json({
            vehicle: "suv",
            km: inputKm,
            grossCharge: parseFloat(grossCharge.toFixed(2)),
            urgent_surcharge: urgentString,
            gst: parseFloat(gst.toFixed(2)),
            netPrice: parseFloat(netPrice.toFixed(2))
        });

    } catch (err) {
        console.error("SUV Logic Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};