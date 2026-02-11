const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pricingRoutes = require('./routes/pricingRoutes');
// 1. Middleware import karein
const authMiddleware = require('./middleware/authMiddleware');

const app = express();

// --- Standard Middleware ---
app.use(cors()); 
app.use(express.json()); 

// --- 🛡️ Security Guard (Global Level) ---
// Is line ke niche likhe gaye tamam routes ab protected hain.
// Har request ko ab 'x-private-key' header ya body mein key bhejni hogi.
app.use(authMiddleware.verifyPrivateKey);

// --- Main Routes ---
app.use('/pricing', pricingRoutes);

// --- Basic Error Handling ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Maplepont API running on http://localhost:${PORT}`);
});