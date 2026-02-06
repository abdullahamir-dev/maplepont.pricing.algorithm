const db = require('../config/db');



exports.calculateFirstClassDistance = async (req, res, next) => {

    // 1. Hourly Logic Connection

    if (req.body.hours && req.body.hours > 0) {

        req.body.vehicleType = 'first-class';

        return next();

    }



    try {

        const inputKm = parseFloat(req.body.km) || 0;

        const { lateNightSurcharge = false, urgentHour = 0, meetAndGreet = false } = req.body;



        // 2. Range Fetching

        let [rates] = await db.query(

            `SELECT * FROM rates_first_class WHERE ? >= min_km AND ? <= max_km LIMIT 1`,

            [inputKm, inputKm]

        );



        let sheetPrice = 0;

        let rateRow;



        // 3. Calculation with 0-Protection

        if (rates.length === 0) {

            const [lastRange] = await db.query(`SELECT * FROM rates_first_class ORDER BY max_km DESC LIMIT 1`);

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

                const [prev] = await db.query(`SELECT total_range_price FROM rates_first_class WHERE max_km < ? ORDER BY max_km DESC LIMIT 1`, [rateRow.min_km]);

                const prevTotal = prev.length > 0 ? parseFloat(prev[0].total_range_price) : 0;



                // Fixed 0-range logic

                const startOfRange = parseFloat(rateRow.min_km) > 0 ? parseFloat(rateRow.min_km) - 1 : 0;

                sheetPrice = prevTotal + ((inputKm - startOfRange) * rateRow.price_per_km);

            }

        }



        // 4. Gross Calculation ($63 Base) & Floor Check ($122.02)

        let pureGross = sheetPrice + 63.00;

        if (inputKm <= 10 && pureGross < 122.02) {

            pureGross = 122.02; // First Class Floor Rule

        }



        // 5. Urgent Surcharge (Decimal Protection Logic)

        let urgentValue = 0;

        let urgentString = "N/A";

        if (parseFloat(urgentHour) > 0) {

            let effectiveHour = urgentHour > 12 ? 12 : urgentHour;

            effectiveHour = Math.ceil(effectiveHour); // Centralized rounding



            const [urgentRow] = await db.query("SELECT percentage FROM urgent_surcharges WHERE hour_threshold = ?", [effectiveHour]);

            if (urgentRow.length > 0) {

                const perc = parseFloat(urgentRow[0].percentage);

                urgentValue = pureGross * (perc / 100);

                urgentString = `$${urgentValue.toFixed(2)} (${perc}%)`;

            }

        }



        // 6. Fixed Add-ons (Night: $25.42, M&G: $35.00)

        let grossCharge = pureGross;

        if (lateNightSurcharge) grossCharge += 25.42;

        if (meetAndGreet) grossCharge += 35.00;



        // 7. Final GST (13%) & Net Price

        const subtotalForTax = grossCharge + urgentValue;

        const gst = subtotalForTax * 0.13;

        const netPrice = subtotalForTax + gst;



        res.json({

            vehicle: "first_class",

            km: inputKm,

            grossCharge: parseFloat(grossCharge.toFixed(2)),

            urgent_surcharge: urgentString,

            gst: parseFloat(gst.toFixed(2)),

            netPrice: parseFloat(netPrice.toFixed(2))

        });



    } catch (err) {

        console.error("First Class Logic Error:", err.message);

        res.status(500).json({ error: "Internal Server Error" });

    }

};