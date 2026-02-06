const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pricingRoutes = require('./routes/pricingRoutes');

const app = express();

// Middleware
app.use(cors()); // Frontend access allow karne ke liye
app.use(express.json()); // Request body (JSON) parse karne ke liye

// Main Routes
app.use('/api/pricing', pricingRoutes);

// Basic Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ status: 'error', message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Maplepont API running on http://localhost:${PORT}`);
});