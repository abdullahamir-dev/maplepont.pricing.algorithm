const db = require('../config/db');

exports.calculateSedanDistance = async (req, res, next) => {
    // 1. Check for Hourly Logic
    if (req.body.hours && req.body.hours > 0) {
        req.body.vehicleType = 'sedan'; // Implicitly setting vehicle type
        return next();
    }

    try {
        const inputKm = parseFloat(req.body.km) || 0;
        const { lateNightSurcharge = false, urgentHour = 0, meetAndGreet = false } = req.body;

        // 2. Fetch the exact range
        let [rates] = await db.query(
            `SELECT * FROM rates_sedan WHERE ? >= min_km AND ? <= max_km LIMIT 1`,
            [inputKm, inputKm]
        );

        let sheetPrice = 0;
        let rateRow;

        // 3. Range Handling (Includes protection for > 800 KM)
        if (rates.length === 0) {
            const [lastRange] = await db.query(`SELECT * FROM rates_sedan ORDER BY max_km DESC LIMIT 1`);

            if (lastRange.length > 0 && inputKm > parseFloat(lastRange[0].max_km)) {
                rateRow = lastRange[0];
                const baseTotal = parseFloat(rateRow.total_range_price);
                const extraKm = inputKm - parseFloat(rateRow.max_km);
                const extraRate = parseFloat(rateRow.price_per_km);
                sheetPrice = baseTotal + (extraKm * extraRate);
            } else {
                return res.status(404).json({ error: "Range not found in database" });
            }
        } else {
            rateRow = rates[0];
            if (inputKm === parseFloat(rateRow.max_km)) {
                sheetPrice = parseFloat(rateRow.total_range_price);
            } else {
                const [prevRates] = await db.query(
                    `SELECT total_range_price FROM rates_sedan WHERE max_km < ? ORDER BY max_km DESC LIMIT 1`,
                    [rateRow.min_km]
                );
                const prevTotal = prevRates.length > 0 ? parseFloat(prevRates[0].total_range_price) : 0;
                // Agar min_km 0 hai to 0 minus karein, warna (min_km - 1)
                const startOfRange = parseFloat(rateRow.min_km) > 0 ? parseFloat(rateRow.min_km) - 1 : 0;
                const extraKm = inputKm - startOfRange;
                sheetPrice = prevTotal + (extraKm * parseFloat(rateRow.price_per_km));
            }
        }

        // 4. Pure Gross ($35 Base + Sheet) & Floor Check ($62)
        let pureGross = sheetPrice + 35.00;
        if (inputKm <= 8 && pureGross < 62.00) {
            pureGross = 62.00; // Sedan Floor Rule
        }

        // 5. Urgent Surcharge (1 to 12+ Hours Logic)
        let urgentValue = 0;
        let urgentString = "N/A";

        if (parseFloat(urgentHour) > 0) {
            // Frontend agar 12 se zyada bhejta hai to 12th hour (10%) hi lagega
            // Aapke itne saare if-else ki jagah sirf ye 1 line:
            let effectiveHour = Math.ceil(urgentHour);
            if (effectiveHour > 12) effectiveHour = 12;
            // const effectiveHour = urgentHour > 12 ? 12 : urgentHour;

            const [urgentRow] = await db.query(
                "SELECT percentage FROM urgent_surcharges WHERE hour_threshold = ? LIMIT 1",
                [effectiveHour]
            );

            if (urgentRow.length > 0) {
                const perc = parseFloat(urgentRow[0].percentage);
                urgentValue = pureGross * (perc / 100);
                urgentString = `$${urgentValue.toFixed(2)} (${perc}%)`;
            }
        }

        // 6. Fixed Add-ons (GrossCharge Includes Night and M&G)
        let grossCharge = pureGross;
        if (lateNightSurcharge) grossCharge += 12.50; // Sedan Night Rate
        if (meetAndGreet) grossCharge += 35.00; // Fixed M&G

        // 7. Final GST (13% on GrossCharge + UrgentValue)
        const subtotalForTax = grossCharge + urgentValue;
        const gst = subtotalForTax * 0.13;
        const netPrice = subtotalForTax + gst;

        res.json({
            grossCharge: parseFloat(grossCharge.toFixed(2)),
            urgent_surcharge: urgentString,
            gst: parseFloat(gst.toFixed(2)),
            netPrice: parseFloat(netPrice.toFixed(2))
        });

    } catch (err) {
        console.error("Critical Sedan Logic Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};